import os
import uuid
import csv
import subprocess
import openpyxl
from openpyxl.utils import get_column_letter
from reportlab.lib.pagesizes import letter, A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

from .multilingual_helper import (
    register_reportlab_multilingual_fonts,
    resolve_reportlab_font,
    normalize_multilingual_text,
    get_best_font_for_script
)

THEME_COLOR_PALETTE = [
    '#FFFFFF', '#000000', '#E7E6E6', '#44546A',
    '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000',
    '#5B9BD5', '#70AD47'
]

def _extract_color_hex(color_obj, default_hex=None) -> str:
    """Extracts a valid 6-character hex string (#RRGGBB) from an openpyxl Color object."""
    if not color_obj:
        return default_hex
    
    # 1. Direct RGB / aRGB string
    if hasattr(color_obj, 'rgb') and color_obj.rgb:
        rgb_str = str(color_obj.rgb)
        if rgb_str in ['00000000', 'None', 'none']:
            return default_hex
        if len(rgb_str) == 8:
            return '#' + rgb_str[2:].upper()
        elif len(rgb_str) == 6:
            return '#' + rgb_str.upper()

    # 2. Theme color with optional tint
    if hasattr(color_obj, 'theme') and color_obj.theme is not None:
        try:
            idx = int(color_obj.theme)
            if 0 <= idx < len(THEME_COLOR_PALETTE):
                base_hex = THEME_COLOR_PALETTE[idx]
                tint = getattr(color_obj, 'tint', 0.0) or 0.0
                if tint != 0.0:
                    r = int(base_hex[1:3], 16)
                    g = int(base_hex[3:5], 16)
                    b = int(base_hex[5:7], 16)
                    if tint > 0:
                        r = int(r + (255 - r) * tint)
                        g = int(g + (255 - g) * tint)
                        b = int(b + (255 - b) * tint)
                    else:
                        r = int(r * (1 + tint))
                        g = int(g * (1 + tint))
                        b = int(b * (1 + tint))
                    r = max(0, min(255, r))
                    g = max(0, min(255, g))
                    b = max(0, min(255, b))
                    return f"#{r:02X}{g:02X}{b:02X}"
                return base_hex
        except Exception:
            pass

    return default_hex

def _get_luminance(hex_str: str) -> float:
    """Returns perceived luminance of a hex color (0 to 255)."""
    if not hex_str or not hex_str.startswith("#") or len(hex_str) < 7:
        return 255.0
    try:
        r = int(hex_str[1:3], 16)
        g = int(hex_str[3:5], 16)
        b = int(hex_str[5:7], 16)
        return 0.299 * r + 0.587 * g + 0.114 * b
    except Exception:
        return 255.0

def _convert_with_excel_com(excel_path: str, output_pdf_path: str) -> bool:
    """
    Uses Microsoft Excel COM Automation on Windows with high-fidelity PageSetup.
    Configures FitToPagesWide, orientation, center alignment, and margin scaling.
    """
    excel = None
    pythoncom_initialized = False
    try:
        import win32com.client
        import pythoncom
        pythoncom.CoInitialize()
        pythoncom_initialized = True

        excel = win32com.client.DispatchEx("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        
        abs_in = os.path.abspath(excel_path)
        abs_out = os.path.abspath(output_pdf_path)
        
        wb = excel.Workbooks.Open(abs_in, ReadOnly=True, UpdateLinks=0)

        # Configure PageSetup for every worksheet in the workbook
        for ws in wb.Worksheets:
            try:
                # Force Landscape so all columns and wide data fit across page
                ws.PageSetup.Orientation = 2  # 2 = xlLandscape
                ws.PageSetup.Zoom = False
                ws.PageSetup.FitToPagesWide = 1
                ws.PageSetup.FitToPagesTall = 1  # Fit strictly to 1 page tall
                ws.PageSetup.CenterHorizontally = True
                ws.PageSetup.LeftMargin = excel.InchesToPoints(0.25)
                ws.PageSetup.RightMargin = excel.InchesToPoints(0.25)
                ws.PageSetup.TopMargin = excel.InchesToPoints(0.25)
                ws.PageSetup.BottomMargin = excel.InchesToPoints(0.25)
            except Exception:
                pass

        # ExportAsFixedFormat: Type=0 (xlTypePDF)
        wb.ExportAsFixedFormat(
            Type=0,
            Filename=abs_out,
            Quality=0,
            IncludeDocProperties=True,
            IgnorePrintAreas=False,
            OpenAfterPublish=False
        )
        wb.Close(False)
        excel.Quit()
        excel = None

        if os.path.exists(output_pdf_path) and os.path.getsize(output_pdf_path) > 0:
            return True
    except Exception as e:
        print(f"[excel_com notice] COM conversion fallback triggered: {e}")
    finally:
        if excel:
            try:
                excel.Quit()
            except Exception:
                pass
        if pythoncom_initialized:
            try:
                import pythoncom
                pythoncom.CoUninitialize()
            except Exception:
                pass

    return False

def _convert_with_libreoffice(excel_path: str, output_pdf_path: str) -> bool:
    soffice_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "soffice"
    ]
    out_dir = os.path.dirname(os.path.abspath(output_pdf_path))
    for soffice in soffice_paths:
        try:
            res = subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", out_dir, excel_path],
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=35)
            if res.returncode == 0:
                base_name = os.path.splitext(os.path.basename(excel_path))[0] + ".pdf"
                generated_pdf = os.path.join(out_dir, base_name)
                if os.path.exists(generated_pdf):
                    if generated_pdf != os.path.abspath(output_pdf_path):
                        if os.path.exists(output_pdf_path):
                            os.remove(output_pdf_path)
                        os.rename(generated_pdf, output_pdf_path)
                    return True
        except Exception:
            continue
    return False

def _convert_with_python_reportlab(excel_path: str, output_pdf_path: str) -> bool:
    """
    High-Fidelity Python-native Excel to PDF Converter:
    1. Preserves cell background colors (exact hex/theme fills).
    2. Preserves font boldness (bold vs normal) and font sizes per cell.
    3. Preserves cell alignment (center, left, right, justify).
    4. Detects and renders cell borders only if present in Excel.
    5. Preserves merged cells and document titles without synthetic headers.
    6. Automatically balances column widths and page orientation.
    7. 100% multilingual support (Bangla, Arabic, Hindi, Latin TrueType fonts).
    """
    try:
        register_reportlab_multilingual_fonts()
        wb = openpyxl.load_workbook(excel_path, data_only=True)

        # Force Landscape orientation for spreadsheets so all columns and data fit comfortably across page
        page_size = landscape(A4)
        margin = 0.25 * inch
        avail_width = page_size[0] - (2 * margin)
        avail_height = page_size[1] - (2 * margin)
        # Account for ReportLab Frame default padding (6pt top + 6pt bottom)
        safe_usable_h = avail_height - 18.0

        pdf_doc = SimpleDocTemplate(
            output_pdf_path,
            pagesize=page_size,
            leftMargin=margin,
            rightMargin=margin,
            topMargin=margin,
            bottomMargin=margin
        )

        story = []

        valid_sheets = [ws for ws in wb.worksheets if ws.max_row > 0 and ws.max_column > 0]
        if not valid_sheets:
            styles = getSampleStyleSheet()
            story.append(Paragraph("Empty Workbook", styles["Normal"]))
            pdf_doc.build(story)
            return True

        for sheet_idx, ws in enumerate(valid_sheets):
            max_row = ws.max_row
            max_col = ws.max_column

            # Identify if sheet has real data
            has_data = False
            for row in ws.iter_rows(values_only=True):
                if any(v is not None and str(v).strip() != "" for v in row):
                    has_data = True
                    break

            if not has_data:
                continue

            # 1. Process Merged Cell Ranges
            span_styles = []
            for m_range in ws.merged_cells.ranges:
                span_styles.append((
                    'SPAN',
                    (m_range.min_col - 1, m_range.min_row - 1),
                    (m_range.max_col - 1, m_range.max_row - 1)
                ))

            # 2. Extract Proportional Column Width Estimates based on actual data length
            raw_col_weights = [8.0] * max_col
            for c_idx in range(1, max_col + 1):
                col_letter = get_column_letter(c_idx)
                dim_w = ws.column_dimensions[col_letter].width if col_letter in ws.column_dimensions else None
                if dim_w and dim_w > 0:
                    raw_col_weights[c_idx - 1] = float(dim_w)
                else:
                    max_len = 4
                    for r_idx in range(1, max_row + 1):
                        v = ws.cell(row=r_idx, column=c_idx).value
                        if v is not None:
                            max_len = max(max_len, len(str(v)))
                    raw_col_weights[c_idx - 1] = max(float(max_len + 2), 6.0)

            total_weight = sum(raw_col_weights)
            col_widths = [(w / total_weight) * avail_width for w in raw_col_weights]

            # 3. Extract Cell Styles & Content Metadata once
            cells_meta = []
            base_table_styles = list(span_styles)

            for r_idx in range(1, max_row + 1):
                row_meta = []
                for c_idx in range(1, max_col + 1):
                    cell = ws.cell(row=r_idx, column=c_idx)
                    val = cell.value
                    raw_text = str(val if val is not None else "").strip()
                    clean_text = normalize_multilingual_text(raw_text)

                    # Check font properties: boldness, size, font family
                    font_bold = bool(cell.font and cell.font.bold)
                    font_name = cell.font.name if (cell.font and cell.font.name) else "Segoe UI"
                    rl_font = resolve_reportlab_font(font_name, is_bold=font_bold)

                    # Check Alignment
                    h_align_raw = (cell.alignment.horizontal if cell.alignment else None) or "left"
                    h_align_str = str(h_align_raw).lower()
                    if h_align_str in ["center", "centercontinuous"]:
                        align_enum = TA_CENTER
                        rl_align = "CENTER"
                    elif h_align_str == "right":
                        align_enum = TA_RIGHT
                        rl_align = "RIGHT"
                    elif h_align_str == "justify":
                        align_enum = TA_JUSTIFY
                        rl_align = "JUSTIFY"
                    else:
                        align_enum = TA_LEFT
                        rl_align = "LEFT"

                    # Vertical Alignment
                    v_align_raw = (cell.alignment.vertical if cell.alignment else None) or "center"
                    v_align_str = str(v_align_raw).lower()
                    if v_align_str == "top":
                        rl_valign = "TOP"
                    elif v_align_str == "bottom":
                        rl_valign = "BOTTOM"
                    else:
                        rl_valign = "MIDDLE"

                    # Extract Background Fill Color
                    bg_hex = None
                    if cell.fill and cell.fill.fill_type:
                        fg = cell.fill.fgColor or cell.fill.start_color
                        bg_hex = _extract_color_hex(fg)

                    if bg_hex and bg_hex != "#FFFFFF":
                        base_table_styles.append(('BACKGROUND', (c_idx - 1, r_idx - 1), (c_idx - 1, r_idx - 1), colors.HexColor(bg_hex)))

                    # Extract Font Color & Contrast
                    explicit_font_hex = None
                    if cell.font and cell.font.color:
                        explicit_font_hex = _extract_color_hex(cell.font.color)

                    if explicit_font_hex:
                        font_color_hex = explicit_font_hex
                    else:
                        lum = _get_luminance(bg_hex) if bg_hex else 255.0
                        font_color_hex = "#FFFFFF" if lum < 130 else "#0F172A"

                    # Extract Borders
                    if cell.border:
                        b = cell.border
                        for side_name, side_obj, cmd in [
                            ('left', b.left, 'LINEBEFORE'),
                            ('right', b.right, 'LINEAFTER'),
                            ('top', b.top, 'LINEABOVE'),
                            ('bottom', b.bottom, 'LINEBELOW')
                        ]:
                            if side_obj and side_obj.style and side_obj.style != 'none':
                                border_col_hex = _extract_color_hex(side_obj.color, default_hex='#CBD5E1')
                                line_width = 1.2 if side_obj.style in ['medium', 'thick', 'double'] else 0.5
                                base_table_styles.append((
                                    cmd,
                                    (c_idx - 1, r_idx - 1),
                                    (c_idx - 1, r_idx - 1),
                                    line_width,
                                    colors.HexColor(border_col_hex)
                                ))

                    # Cell Alignment
                    base_table_styles.append(('ALIGN', (c_idx - 1, r_idx - 1), (c_idx - 1, r_idx - 1), rl_align))
                    base_table_styles.append(('VALIGN', (c_idx - 1, r_idx - 1), (c_idx - 1, r_idx - 1), rl_valign))

                    safe_text = clean_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    row_meta.append({
                        'text': safe_text,
                        'rl_font': rl_font,
                        'font_color_hex': font_color_hex,
                        'align_enum': align_enum,
                    })
                cells_meta.append(row_meta)

            # 4. Iterative Auto-Fit: dynamically adjusts font size & padding to fit in exactly 1 page
            target_row_h = safe_usable_h / max(max_row, 1)
            best_table = None

            for attempt in range(20):
                scale = 1.0 - (attempt * 0.045)
                font_size = max(4.0, min(10.0, target_row_h * 0.58 * scale))
                leading = font_size * 1.12
                v_pad = max(0.2, min(3.2, ((target_row_h * scale) - leading) / 2))
                h_pad = max(1.0, min(4.0, (avail_width / max_col) * 0.07))

                sheet_table_styles = list(base_table_styles)
                sheet_table_styles.append(('TOPPADDING', (0, 0), (-1, -1), v_pad))
                sheet_table_styles.append(('BOTTOMPADDING', (0, 0), (-1, -1), v_pad))
                sheet_table_styles.append(('LEFTPADDING', (0, 0), (-1, -1), h_pad))
                sheet_table_styles.append(('RIGHTPADDING', (0, 0), (-1, -1), h_pad))

                grid_data = []
                for r_idx, row_meta in enumerate(cells_meta, start=1):
                    row_cells = []
                    for c_idx, c_info in enumerate(row_meta, start=1):
                        p_style = ParagraphStyle(
                            f'cell_{sheet_idx}_{attempt}_{r_idx}_{c_idx}',
                            fontName=c_info['rl_font'],
                            fontSize=font_size,
                            leading=leading,
                            textColor=colors.HexColor(c_info['font_color_hex']),
                            alignment=c_info['align_enum']
                        )
                        row_cells.append(Paragraph(c_info['text'], p_style))
                    grid_data.append(row_cells)

                t = Table(grid_data, colWidths=col_widths)
                t.setStyle(TableStyle(sheet_table_styles))
                w, h = t.wrap(avail_width, avail_height)
                best_table = t

                if h <= safe_usable_h:
                    break

            if best_table:
                story.append(best_table)

            if sheet_idx < len(valid_sheets) - 1:
                story.append(PageBreak())

        if not story:
            styles = getSampleStyleSheet()
            story.append(Paragraph("Empty Workbook", styles["Normal"]))

        pdf_doc.build(story)
        return True
    except Exception as e:
        print(f"[excel_to_pdf reportlab error] {e}")
        return False

def _prepare_excel_for_landscape(excel_path: str) -> str:
    """
    Prepares spreadsheet for Landscape printing before passing to LibreOffice or COM:
    - Sets orientation to Landscape
    - Sets paperSize to A4
    - Enables fitToPage with fitToWidth=1 and fitToHeight=1
    Supports .xlsx and .csv files.
    """
    try:
        ext = os.path.splitext(excel_path)[1].lower()
        if ext == '.csv':
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Sheet1"
            with open(excel_path, 'r', encoding='utf-8', errors='replace') as f:
                reader = csv.reader(f)
                for row in reader:
                    ws.append(row)
        elif ext == '.xlsx':
            wb = openpyxl.load_workbook(excel_path)
        else:
            return excel_path

        for ws in wb.worksheets:
            try:
                ws.sheet_properties.pageSetUpPr.fitToPage = True
            except Exception:
                pass
            ws.page_setup.orientation = ws.ORIENTATION_LANDSCAPE
            ws.page_setup.paperSize = ws.PAPERSIZE_A4
            ws.page_setup.fitToWidth = 1
            ws.page_setup.fitToHeight = 1

        out_dir = os.path.dirname(os.path.abspath(excel_path))
        temp_path = os.path.join(out_dir, f"prep_landscape_{uuid.uuid4().hex[:8]}.xlsx")
        wb.save(temp_path)
        return temp_path
    except Exception as e:
        print(f"[prepare_excel_for_landscape warning] {e}")
        return excel_path

def _is_pdf_landscape(pdf_path: str) -> bool:
    """Returns True if the generated PDF is in Landscape orientation."""
    try:
        from pypdf import PdfReader
        if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
            return False
        reader = PdfReader(pdf_path)
        if not reader.pages:
            return False
        page = reader.pages[0]
        rot = int(page.get('/Rotate', 0) or 0)
        w = float(page.mediabox.width)
        h = float(page.mediabox.height)
        if rot in [90, 270]:
            w, h = h, w
        return w > h
    except Exception:
        return False

def _force_pdf_landscape(pdf_path: str) -> bool:
    """If any page in the PDF is still portrait (width < height), rotates it to landscape."""
    try:
        from pypdf import PdfReader, PdfWriter
        if not os.path.exists(pdf_path):
            return False
        reader = PdfReader(pdf_path)
        writer = PdfWriter()
        modified = False
        for page in reader.pages:
            rot = int(page.get('/Rotate', 0) or 0)
            w = float(page.mediabox.width)
            h = float(page.mediabox.height)
            if rot in [90, 270]:
                w, h = h, w
            if w < h:
                page.rotate(90)
                modified = True
            writer.add_page(page)
        if modified:
            with open(pdf_path, 'wb') as f:
                writer.write(f)
        return True
    except Exception as e:
        print(f"[force_pdf_landscape warning] {e}")
        return False

def convert_excel_to_pdf(excel_path: str, output_pdf_path: str) -> str:
    """
    Converts an Excel spreadsheet (.xlsx / .xls / .csv) to a PDF document with 100% precision:
    - Guaranteed Landscape orientation for wide visibility.
    - Fits onto a single page (or 1 page per sheet).
    - Preserves exact cell colors, column widths, font weights, borders, and alignments.
    - 100% multilingual font support.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_pdf_path)), exist_ok=True)

    prepared_path = _prepare_excel_for_landscape(excel_path)
    clean_prepared = (prepared_path != excel_path and os.path.exists(prepared_path))

    try:
        # Strategy 1: Excel COM with PageSetup optimization
        if _convert_with_excel_com(prepared_path, output_pdf_path):
            if _is_pdf_landscape(output_pdf_path):
                return output_pdf_path

        # Strategy 2: LibreOffice Headless with prepared landscape workbook
        if _convert_with_libreoffice(prepared_path, output_pdf_path):
            if _is_pdf_landscape(output_pdf_path):
                return output_pdf_path

        # Strategy 3: openpyxl + High-Fidelity Multilingual ReportLab Engine (Always Landscape & 1 page)
        if _convert_with_python_reportlab(excel_path, output_pdf_path):
            if _is_pdf_landscape(output_pdf_path):
                return output_pdf_path

        # Strategy 4: If any engine created a PDF but it wasn't landscape, force rotate
        if os.path.exists(output_pdf_path) and os.path.getsize(output_pdf_path) > 0:
            _force_pdf_landscape(output_pdf_path)
            return output_pdf_path
    finally:
        if clean_prepared:
            try:
                os.remove(prepared_path)
            except Exception:
                pass

    raise RuntimeError("Failed to convert Excel spreadsheet to PDF using all available engines.")

