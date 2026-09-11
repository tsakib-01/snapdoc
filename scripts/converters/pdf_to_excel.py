import os
import io
import fitz  # PyMuPDF
import pdfplumber
import openpyxl
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from PIL import Image

import unicodedata

def _clean_text(text: str) -> str:
    """Clean standard text and numbers, preserving English characters without Bangla/Bijoy mutations."""
    if not text:
        return ""
    normalized = unicodedata.normalize('NFC', str(text))
    return "".join(ch for ch in normalized if ch == '\n' or ch == '\t' or ch >= ' ').strip()

def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"{r:02X}{g:02X}{b:02X}"

def _get_luminance(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b

def _sample_cell_bg_color(im: Image.Image, bbox: tuple, scale_x: float, scale_y: float) -> tuple:
    """
    Samples the background fill color of a cell from the rendered high-res page image.
    """
    if not bbox:
        return (255, 255, 255)

    x0, y0, x1, y1 = bbox
    px0 = max(0, int(x0 * scale_x))
    py0 = max(0, int(y0 * scale_y))
    px1 = min(im.width - 1, int(x1 * scale_x))
    py1 = min(im.height - 1, int(y1 * scale_y))

    if px1 <= px0 or py1 <= py0:
        return (255, 255, 255)

    w = px1 - px0
    h = py1 - py0
    sample_points = [
        (px0 + int(w * 0.15), py0 + int(h * 0.20)),
        (px0 + int(w * 0.85), py0 + int(h * 0.20)),
        (px0 + int(w * 0.15), py0 + int(h * 0.80)),
        (px0 + int(w * 0.85), py0 + int(h * 0.80)),
        (px0 + int(w * 0.50), py0 + int(h * 0.15)),
        (px0 + int(w * 0.50), py0 + int(h * 0.85))
    ]

    colors_sampled = []
    for sx, sy in sample_points:
        if 0 <= sx < im.width and 0 <= sy < im.height:
            p = im.getpixel((sx, sy))
            if isinstance(p, (tuple, list)):
                colors_sampled.append(p[:3])

    if not colors_sampled:
        return (255, 255, 255)

    avg_r = sum(c[0] for c in colors_sampled) // len(colors_sampled)
    avg_g = sum(c[1] for c in colors_sampled) // len(colors_sampled)
    avg_b = sum(c[2] for c in colors_sampled) // len(colors_sampled)
    return (avg_r, avg_g, avg_b)

def _determine_text_alignment(spans: list, cell_bbox: tuple) -> str:
    """
    Determines whether text in a cell is centered, right-aligned, or left-aligned.
    """
    if not spans or not cell_bbox:
        return "center"

    cx0, cy0, cx1, cy1 = cell_bbox
    cell_w = cx1 - cx0
    if cell_w <= 0:
        return "center"

    tx0 = min(s.get("bbox", [cx0, cy0, cx1, cy1])[0] for s in spans)
    tx1 = max(s.get("bbox", [cx0, cy0, cx1, cy1])[2] for s in spans)

    text_center = (tx0 + tx1) / 2.0
    cell_center = (cx0 + cx1) / 2.0

    left_margin = tx0 - cx0
    right_margin = cx1 - tx1

    if abs(text_center - cell_center) < (cell_w * 0.18):
        return "center"
    elif right_margin < (cell_w * 0.15) and left_margin > right_margin:
        return "right"
    else:
        return "left"

def _detect_table_borders(page, tbl_bbox: tuple) -> tuple:
    """
    Checks if there are vector border lines or grid strokes inside/around the table.
    Returns (has_borders: bool, border_hex: str).
    """
    tx0, ty0, tx1, ty1 = tbl_bbox
    drawings = page.get_drawings()
    stroke_colors = []

    for d in drawings:
        r = d.get('rect', [0, 0, 0, 0])
        rx0, ry0, rx1, ry1 = r
        if not (rx1 < tx0 - 5 or rx0 > tx1 + 5 or ry1 < ty0 - 5 or ry0 > ty1 + 5):
            stroke_col = d.get('color')
            if stroke_col and isinstance(stroke_col, (list, tuple)) and len(stroke_col) >= 3:
                stroke_colors.append(stroke_col)
            for item in d.get('items', []):
                if item and item[0] in ['l', 're', 'c'] and stroke_col:
                    stroke_colors.append(stroke_col)

    if stroke_colors:
        avg_col = stroke_colors[0]
        if len(avg_col) >= 3:
            r = int(avg_col[0] * 255 if avg_col[0] <= 1.0 else avg_col[0])
            g = int(avg_col[1] * 255 if avg_col[1] <= 1.0 else avg_col[1])
            b = int(avg_col[2] * 255 if avg_col[2] <= 1.0 else avg_col[2])
            return True, _rgb_to_hex(r, g, b)

    return False, 'CBD5E1'

def convert_pdf_to_excel(pdf_path: str, output_excel_path: str) -> str:
    """
    High-Fidelity PDF to Excel Converter:
    1. Detects exact font boldness (bold vs normal) and font sizes per cell.
    2. Detects if borders exist in the PDF table; only adds borders if present in the PDF.
    3. Extracts exact cell background colors (e.g. Forest Green header, light green/white alternating rows).
    4. Faithfully preserves cell horizontal alignment (center, left, right) and vertical center alignment.
    5. Detects titles (e.g. 'Fruit Price List'), centers/merges them, and leaves a blank row before the table.
    6. Eliminates any synthetic headers like '--- Page 1 of 1 ---'.
    """
    wb = Workbook()
    wb.remove(wb.active)

    pdf_doc = fitz.open(pdf_path)
    
    plumber_pdf = None
    try:
        plumber_pdf = pdfplumber.open(pdf_path)
    except Exception:
        pass

    for page_idx, page in enumerate(pdf_doc, start=1):
        ws_title = f"Sheet{page_idx}" if len(pdf_doc) > 1 else "Sheet1"
        ws = wb.create_sheet(title=ws_title)
        current_row = 1

        p_width = page.rect.width
        p_height = page.rect.height

        # Render high-res page image for exact background color sampling
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        scale_x = pil_img.width / p_width
        scale_y = pil_img.height / p_height

        text_dict = page.get_text("dict")
        raw_blocks = text_dict.get("blocks", [])
        text_blocks = [b for b in raw_blocks if b.get("type") == 0]

        # 1. Try PyMuPDF find_tables
        tables = []
        try:
            table_finder = page.find_tables()
            if table_finder and table_finder.tables:
                tables = table_finder.tables
        except Exception:
            tables = []

        if tables:
            for tbl in tables:
                tbl_x0, tbl_y0, tbl_x1, tbl_y1 = tbl.bbox
                extracted_data = tbl.extract()
                if not extracted_data or len(extracted_data) == 0:
                    continue

                num_cols = max(len(r) for r in extracted_data)
                if num_cols == 0:
                    continue

                # Detect if table in PDF has borders
                has_borders, border_hex = _detect_table_borders(page, (tbl_x0, tbl_y0, tbl_x1, tbl_y1))
                if has_borders:
                    cell_border = Border(
                        left=Side(style='thin', color=border_hex),
                        right=Side(style='thin', color=border_hex),
                        top=Side(style='thin', color=border_hex),
                        bottom=Side(style='thin', color=border_hex)
                    )
                else:
                    cell_border = Border()

                # Extract titles situated above the table
                top_titles = []
                for b in text_blocks:
                    bx0, by0, bx1, by1 = b.get("bbox", [0, 0, 0, 0])
                    if by1 <= tbl_y0 + 5:
                        b_text = "".join(s.get("text", "") for l in b.get("lines", []) for s in l.get("spans", [])).strip()
                        if b_text:
                            # Check title boldness & size
                            first_span = b.get("lines", [{}])[0].get("spans", [{}])[0]
                            t_font_name = first_span.get("font", "").lower()
                            t_flags = first_span.get("flags", 0)
                            t_is_bold = bool(t_flags & (2 ** 4)) or any(k in t_font_name for k in ["bold", "black", "heavy", "semibold"]) or True
                            t_size = max(first_span.get("size", 15), 13)
                            top_titles.append((b, b_text, by0, t_is_bold, t_size))

                top_titles.sort(key=lambda t: t[2])

                for b, b_text, _, t_is_bold, t_size in top_titles:
                    bx0, by0, bx1, by1 = b.get("bbox", [0, 0, 0, 0])
                    b_center = (bx0 + bx1) / 2.0
                    
                    if abs(b_center - (p_width / 2.0)) < (p_width * 0.20):
                        title_align = "center"
                    elif bx0 > p_width * 0.55:
                        title_align = "right"
                    else:
                        title_align = "left"

                    clean_title = _clean_text(b_text)
                    
                    if title_align == "center" and num_cols > 1:
                        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=num_cols)

                    cell = ws.cell(row=current_row, column=1, value=clean_title)
                    cell.font = Font(name="Segoe UI", size=t_size, bold=t_is_bold, color="000000")
                    cell.alignment = Alignment(horizontal=title_align, vertical="center")
                    current_row += 1

                # Leave an empty row before table
                if top_titles:
                    current_row += 1

                # Render Table Rows with exact font boldness, colors, and alignment
                table_rows = tbl.rows
                for r_idx, row_obj in enumerate(table_rows):
                    row_data = extracted_data[r_idx] if r_idx < len(extracted_data) else []
                    is_header = (r_idx == 0)

                    for c_idx in range(num_cols):
                        cell_val_raw = row_data[c_idx] if c_idx < len(row_data) else ""
                        cell_val = _clean_text(str(cell_val_raw or "").strip())
                        
                        cell_bbox = row_obj.cells[c_idx] if (c_idx < len(row_obj.cells) and row_obj.cells[c_idx]) else row_obj.bbox
                        if not cell_bbox:
                            cell_bbox = (tbl_x0, row_obj.bbox[1], tbl_x1, row_obj.bbox[3])

                        # Sample exact cell background color
                        bg_rgb = _sample_cell_bg_color(pil_img, cell_bbox, scale_x, scale_y)
                        bg_hex = _rgb_to_hex(*bg_rgb)
                        lum = _get_luminance(*bg_rgb)

                        # Find spans inside cell bbox to determine exact font weight (bold/normal) & alignment
                        cell_spans = []
                        cx0, cy0, cx1, cy1 = cell_bbox
                        for b in text_blocks:
                            for l in b.get("lines", []):
                                for s in l.get("spans", []):
                                    sx0, sy0, sx1, sy1 = s.get("bbox", [0, 0, 0, 0])
                                    if (sx0 >= cx0 - 5 and sx1 <= cx1 + 5 and sy0 >= cy0 - 5 and sy1 <= cy1 + 5):
                                        cell_spans.append(s)

                        # Check if text inside cell is bold
                        is_bold = is_header
                        font_size_pt = 10.5 if is_header else 10
                        if cell_spans:
                            span_flags = cell_spans[0].get("flags", 0)
                            span_font = cell_spans[0].get("font", "").lower()
                            if bool(span_flags & (2 ** 4)) or any(k in span_font for k in ["bold", "black", "heavy", "semibold"]):
                                is_bold = True
                            elif not is_header:
                                is_bold = False
                            font_size_pt = max(cell_spans[0].get("size", font_size_pt), 9)

                        h_align = _determine_text_alignment(cell_spans, cell_bbox)

                        if lum < 130:
                            font_color = "FFFFFF"
                        else:
                            font_color = "000000" if is_header else "1E293B"

                        cell = ws.cell(row=current_row, column=c_idx + 1, value=cell_val)
                        cell.border = cell_border
                        cell.alignment = Alignment(horizontal=h_align, vertical="center", wrap_text=True)

                        if bg_hex != "FFFFFF" or is_header:
                            cell.fill = PatternFill(start_color=bg_hex, end_color=bg_hex, fill_type="solid")

                        cell.font = Font(
                            name="Segoe UI",
                            size=font_size_pt,
                            bold=is_bold,
                            color=font_color
                        )

                    current_row += 1

                current_row += 1

        elif plumber_pdf and len(plumber_pdf.pages) >= page_idx:
            plumber_page = plumber_pdf.pages[page_idx - 1]
            p_tables = plumber_page.extract_tables()
            if p_tables:
                for tbl_data in p_tables:
                    if not tbl_data:
                        continue
                    num_cols = max(len(r) for r in tbl_data)
                    for r_idx, row in enumerate(tbl_data):
                        is_header = (r_idx == 0)
                        for c_idx in range(num_cols):
                            val = _clean_text(str(row[c_idx] if c_idx < len(row) and row[c_idx] else "").strip())
                            c = ws.cell(row=current_row, column=c_idx + 1, value=val)
                            c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                            c.font = Font(name="Segoe UI", size=10.5 if is_header else 10, bold=is_header)
                        current_row += 1
                    current_row += 1
            else:
                for b in text_blocks:
                    b_text = "".join(s.get("text", "") for l in b.get("lines", []) for s in l.get("spans", [])).strip()
                    if b_text:
                        ws.cell(row=current_row, column=1, value=_clean_text(b_text))
                        current_row += 1
        else:
            for b in text_blocks:
                b_text = "".join(s.get("text", "") for l in b.get("lines", []) for s in l.get("spans", [])).strip()
                if b_text:
                    ws.cell(row=current_row, column=1, value=_clean_text(b_text))
                    current_row += 1

        # Adjust column widths automatically
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                if cell.value:
                    lines = str(cell.value).split("\n")
                    for l in lines:
                        max_len = max(max_len, len(l))
            adjusted_width = min(max(max_len + 5, 14), 45)
            ws.column_dimensions[col_letter].width = adjusted_width

    pdf_doc.close()
    if plumber_pdf:
        try:
            plumber_pdf.close()
        except Exception:
            pass

    os.makedirs(os.path.dirname(os.path.abspath(output_excel_path)), exist_ok=True)
    wb.save(output_excel_path)
    return output_excel_path
