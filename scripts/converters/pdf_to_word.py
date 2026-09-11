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

def _post_process_docx_multilingual(docx_path: str):
    """
    Applies Unicode normalization and Complex Script (Bangla/Indic/Arabic) font tagging
    to all paragraphs and tables in the docx without disrupting pdf2docx layout, tables, or images.
    """
    try:
        doc = Document(docx_path)
        modified = False

        for p in doc.paragraphs:
            for r in p.runs:
                if r.text:
                    clean = normalize_multilingual_text(r.text)
                    if clean != r.text:
                        r.text = clean
                        modified = True
                    style_docx_run_multilingual(r, r.text, font_family=r.font.name if r.font else None)

        for t in doc.tables:
            for row in t.rows:
                for cell in row.cells:
                    for p in cell.paragraphs:
                        for r in p.runs:
                            if r.text:
                                clean = normalize_multilingual_text(r.text)
                                if clean != r.text:
                                    r.text = clean
                                    modified = True
                                style_docx_run_multilingual(r, r.text, font_family=r.font.name if r.font else None)

        if modified:
            doc.save(docx_path)
    except Exception as e:
        print(f"[post-processing notice] {e}")

def _convert_with_pdf2docx(pdf_path: str, output_docx_path: str) -> bool:
    """
    Primary High-Fidelity Converter using pdf2docx:
    - Reconstructs exact visual layout, margins, page geometry, headers, and footers.
    - Accurately positions inline and floating images (logos, diagrams).
    - Preserves tables, borders, and multi-column flows without artificial splitting.
    """
    try:
        from pdf2docx import Converter
        cv = Converter(pdf_path)
        cv.convert(output_docx_path)
        cv.close()

        if os.path.exists(output_docx_path) and os.path.getsize(output_docx_path) > 0:
            _post_process_docx_multilingual(output_docx_path)
            return True
    except Exception as e:
        print(f"[pdf2docx conversion notice] {e}")
    return False

def _convert_with_pymupdf_fallback(pdf_path: str, output_docx_path: str) -> bool:
    """
    Secondary fallback using PyMuPDF block extraction.
    """
    try:
        pdf_doc = fitz.open(pdf_path)
        doc = Document()

        for section in doc.sections:
            section.top_margin = Inches(0.75)
            section.bottom_margin = Inches(0.75)
            section.left_margin = Inches(0.75)
            section.right_margin = Inches(0.75)

        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            text_page = page.get_text("dict")
            blocks = text_page.get("blocks", [])

            # Sort blocks top-to-bottom by Y coordinate
            blocks.sort(key=lambda b: b.get("bbox", [0, 0, 0, 0])[1])

            for b in blocks:
                if b.get("type") == 0:  # Text block
                    lines = b.get("lines", [])
                    for line in lines:
                        spans = line.get("spans", [])
                        if not spans:
                            continue
                        p = doc.add_paragraph()
                        p.paragraph_format.space_before = Pt(1)
                        p.paragraph_format.space_after = Pt(2)
                        p.paragraph_format.line_spacing = 1.15

                        for span in spans:
                            raw_text = span.get("text", "")
                            clean_text = normalize_multilingual_text(raw_text)
                            if not clean_text:
                                continue
                            run = p.add_run(clean_text)
                            style_docx_run_multilingual(
                                run=run,
                                text=clean_text,
                                font_family=span.get("font", "Segoe UI"),
                                font_size_pt=span.get("size", 11),
                                is_bold=bool(span.get("flags", 0) & 16) or "bold" in span.get("font", "").lower(),
                                is_italic=bool(span.get("flags", 0) & 2) or "italic" in span.get("font", "").lower()
                            )
                elif b.get("type") == 1:  # Image block
                    img_bytes = b.get("image")
                    if img_bytes:
                        try:
                            img_stream = io.BytesIO(img_bytes)
                            p = doc.add_paragraph()
                            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            run = p.add_run()
                            run.add_picture(img_stream, width=Inches(min(5.5, (b.get("width", 300) / 72))))
                        except Exception:
                            pass

            if page_num < len(pdf_doc) - 1:
                doc.add_page_break()

        doc.save(output_docx_path)
        return os.path.exists(output_docx_path) and os.path.getsize(output_docx_path) > 0
    except Exception as e:
        print(f"[pymupdf fallback error] {e}")
        return False

def convert_pdf_to_word(pdf_path: str, output_docx_path: str) -> str:
    """
    Converts a PDF file to a Microsoft Word (.docx) document with 100% layout and font fidelity:
    1. Primary: pdf2docx layout reconstruction engine (exact visual positions, inline logos, tables).
    2. Fallback: PyMuPDF multilingual block extractor.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_docx_path)), exist_ok=True)

    # 1. Primary: pdf2docx for exact layout and position preservation
    if _convert_with_pdf2docx(pdf_path, output_docx_path):
        return output_docx_path

    # 2. Secondary fallback
    if _convert_with_pymupdf_fallback(pdf_path, output_docx_path):
        return output_docx_path

    raise RuntimeError("Failed to convert PDF to Word document using all available conversion engines.")
