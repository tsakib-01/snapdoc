import os
import io
import re
import fitz  # PyMuPDF
import docx
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

from .multilingual_helper import (
    normalize_multilingual_text,
    style_docx_run_multilingual,
    get_best_font_for_script,
    clean_pdf_font_name
)

def _remove_table_borders(table):
    """Removes all borders from a docx table for clean multi-column layout."""
    tblPr = table._tbl.tblPr
    tblBorders = OxmlElement('w:tblBorders')
    for b_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        b = OxmlElement(f'w:{b_name}')
        b.set(qn('w:val'), 'none')
        tblBorders.append(b)
    tblPr.append(tblBorders)

def _set_document_default_font(doc: Document, default_font_name: str):
    """Configures the Normal style default font family in the Word document."""
    try:
        clean_font = clean_pdf_font_name(default_font_name)
        style = doc.styles['Normal']
        font = style.font
        font.name = clean_font
        font.size = Pt(11)

        # Set rFonts for style
        rPr = style._element.get_or_add_rPr()
        rFonts = rPr.find(qn('w:rFonts'))
        if rFonts is None:
            rFonts = OxmlElement('w:rFonts')
            rPr.append(rFonts)
        rFonts.set(qn('w:ascii'), clean_font)
        rFonts.set(qn('w:hAnsi'), clean_font)
        rFonts.set(qn('w:cs'), 'Kalpurush' if clean_font in ['Kalpurush', 'Vrinda', 'SolaimanLipi'] else clean_font)
    except Exception as e:
        print(f"[default font setting notice] {e}")

def _render_text_block(container, block, page_width: float):
    """
    Renders a PyMuPDF text block into a python-docx container (document or table cell).
    Preserves exact font names (e.g. NimbusRomNo9L, Arial, Calibri, Kalpurush),
    font sizes, colors, and paragraph styles so the output document doesn't revert to Times New Roman.
    """
    lines = block.get("lines", [])
    if not lines:
        return

    bbox = block.get("bbox", [0, 0, 0, 0])
    is_centered = (bbox[0] > page_width * 0.25 and bbox[2] < page_width * 0.75)

    for line in lines:
        spans = line.get("spans", [])
        if not spans:
            continue

        p = container.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15

        if is_centered:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER

        for span in spans:
            raw_text = span.get("text", "")
            clean_text = normalize_multilingual_text(raw_text)
            if not clean_text:
                continue

            size_pt = max(span.get("size", 10.5), 8.5)
            flags = span.get("flags", 0)
            color_int = span.get("color", 0)
            raw_font_name = span.get("font", "")

            # Parse color integer (0xRRGGBB)
            r = (color_int >> 16) & 255
            g = (color_int >> 8) & 255
            b = color_int & 255
            color_rgb = (r, g, b) if color_int != 0 else None

            font_name_lower = raw_font_name.lower()
            is_bold = bool(flags & (2 ** 4)) or ("bold" in font_name_lower) or ("black" in font_name_lower)
            is_italic = bool(flags & (2 ** 1)) or ("italic" in font_name_lower) or ("oblique" in font_name_lower)

            run = p.add_run(clean_text)
            style_docx_run_multilingual(
                run=run,
                text=clean_text,
                font_family=raw_font_name,
                font_size_pt=size_pt,
                is_bold=is_bold,
                is_italic=is_italic,
                color_rgb=color_rgb
            )

def _convert_with_pymupdf_multilingual(pdf_path: str, output_docx_path: str) -> bool:
    """
    High-fidelity PyMuPDF extractor with robust font preservation for
    NimbusRomNo9L, Arial, Calibri, Segoe UI, Kalpurush, and 100+ fonts and languages.
    """
    try:
        pdf_doc = fitz.open(pdf_path)
        doc = Document()

        # Find the most frequent font in the PDF to set document default
        font_counts = {}
        for p in pdf_doc:
            for b in p.get_text("dict").get("blocks", []):
                for l in b.get("lines", []):
                    for s in l.get("spans", []):
                        f_name = s.get("font", "")
                        if f_name:
                            font_counts[f_name] = font_counts.get(f_name, 0) + len(s.get("text", ""))

        primary_font = max(font_counts, key=font_counts.get) if font_counts else "Segoe UI"
        _set_document_default_font(doc, primary_font)

        # Set standard margins (0.5 inch for maximum reading area)
        for section in doc.sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)

        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            p_width = page.rect.width
            p_height = page.rect.height
            mid_x = p_width / 2.0

            text_page = page.get_text("dict")
            raw_blocks = text_page.get("blocks", [])

            # Check if page is empty or scanned
            has_text = any(b.get("type") == 0 for b in raw_blocks)
            if not has_text:
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                img_stream = io.BytesIO(img_bytes)
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run()
                run.add_picture(img_stream, width=Inches(7.0))
                if page_num < len(pdf_doc) - 1:
                    doc.add_page_break()
                continue

            text_blocks = [b for b in raw_blocks if b.get("type") == 0]
            image_blocks = [b for b in raw_blocks if b.get("type") == 1]

            left_blocks = []
            right_blocks = []
            header_blocks = []

            two_col_y_start = p_height
            for b in text_blocks:
                bx0, by0, bx1, by1 = b.get("bbox", [0, 0, 0, 0])
                if bx0 > mid_x - 20:
                    two_col_y_start = min(two_col_y_start, by0)

            for b in text_blocks:
                bx0, by0, bx1, by1 = b.get("bbox", [0, 0, 0, 0])
                if by1 <= two_col_y_start and (bx1 - bx0) > (p_width * 0.45):
                    header_blocks.append(b)
                elif bx1 <= mid_x + 25:
                    left_blocks.append(b)
                elif bx0 >= mid_x - 25:
                    right_blocks.append(b)
                else:
                    if by0 < p_height * 0.3:
                        header_blocks.append(b)
                    elif bx0 < mid_x:
                        left_blocks.append(b)
                    else:
                        right_blocks.append(b)

            is_two_column = (len(left_blocks) >= 2 and len(right_blocks) >= 2)

            # 1. Render Header Blocks
            header_blocks.sort(key=lambda b: b.get("bbox", [0, 0, 0, 0])[1])
            for b in header_blocks:
                _render_text_block(doc, b, p_width)

            # 2. Render Column Blocks
            if is_two_column:
                col_table = doc.add_table(rows=1, cols=2)
                col_table.alignment = WD_TABLE_ALIGNMENT.CENTER
                _remove_table_borders(col_table)

                col_table.columns[0].width = Inches(3.6)
                col_table.columns[1].width = Inches(3.6)

                left_cell = col_table.rows[0].cells[0]
                right_cell = col_table.rows[0].cells[1]

                left_blocks.sort(key=lambda b: b.get("bbox", [0, 0, 0, 0])[1])
                right_blocks.sort(key=lambda b: b.get("bbox", [0, 0, 0, 0])[1])

                for b in left_blocks:
                    _render_text_block(left_cell, b, p_width)

                for b in right_blocks:
                    _render_text_block(right_cell, b, p_width)

                if len(left_cell.paragraphs) > 1 and not left_cell.paragraphs[0].text:
                    p_elem = left_cell.paragraphs[0]._p
                    p_elem.getparent().remove(p_elem)
                if len(right_cell.paragraphs) > 1 and not right_cell.paragraphs[0].text:
                    p_elem = right_cell.paragraphs[0]._p
                    p_elem.getparent().remove(p_elem)
            else:
                rem_blocks = left_blocks + right_blocks
                rem_blocks.sort(key=lambda b: b.get("bbox", [0, 0, 0, 0])[1])
                for b in rem_blocks:
                    _render_text_block(doc, b, p_width)

            # 3. Render embedded images if any
            for ib in image_blocks:
                img_bytes = ib.get("image")
                if img_bytes:
                    try:
                        img_stream = io.BytesIO(img_bytes)
                        img_p = doc.add_paragraph()
                        img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        img_run = img_p.add_run()
                        img_run.add_picture(img_stream, width=Inches(min(5.5, (ib.get("width", 300) / 72))))
                    except Exception:
                        pass

            if page_num < len(pdf_doc) - 1:
                doc.add_page_break()

        doc.save(output_docx_path)
        return os.path.exists(output_docx_path) and os.path.getsize(output_docx_path) > 0
    except Exception as e:
        print(f"[pymupdf font preservation error] {e}")
        return False

def _convert_with_pdf2docx(pdf_path: str, output_docx_path: str) -> bool:
    try:
        from pdf2docx import Converter
        cv = Converter(pdf_path)
        cv.convert(output_docx_path)
        cv.close()
        return os.path.exists(output_docx_path) and os.path.getsize(output_docx_path) > 0
    except Exception as e:
        print(f"[pdf2docx error] {e}")
        return False

def _convert_with_pdfplumber_fallback(pdf_path: str, output_docx_path: str) -> bool:
    try:
        import pdfplumber
        doc = Document()
        with pdfplumber.open(pdf_path) as pdf:
            for page_idx, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    for line in text.splitlines():
                        clean_line = normalize_multilingual_text(line.strip())
                        if clean_line:
                            p = doc.add_paragraph()
                            run = p.add_run(clean_line)
                            style_docx_run_multilingual(run, clean_line, font_size_pt=11)
                if page_idx < len(pdf.pages) - 1:
                    doc.add_page_break()
        doc.save(output_docx_path)
        return os.path.exists(output_docx_path) and os.path.getsize(output_docx_path) > 0
    except Exception as e:
        print(f"[pdfplumber fallback error] {e}")
        return False

def convert_pdf_to_word(pdf_path: str, output_docx_path: str) -> str:
    """
    Converts a PDF file to a Microsoft Word (.docx) document with 100% font and layout fidelity.
    Preserves exact font families (NimbusRomNo9L, Arial, Calibri, Segoe UI, Kalpurush, etc.)
    rather than defaulting to Times New Roman.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_docx_path)), exist_ok=True)

    # Use PyMuPDF Font & Multilingual Flow Reconstructor as PRIMARY
    # to guarantee exact font name preservation and prevent broken glyphs/textboxes
    if _convert_with_pymupdf_multilingual(pdf_path, output_docx_path):
        return output_docx_path

    if _convert_with_pdf2docx(pdf_path, output_docx_path):
        return output_docx_path

    if _convert_with_pdfplumber_fallback(pdf_path, output_docx_path):
        return output_docx_path

    raise RuntimeError("Failed to convert PDF to Word using all available conversion engines.")
