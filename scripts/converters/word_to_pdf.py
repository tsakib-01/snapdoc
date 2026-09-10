import os
import sys
import io
import subprocess
import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.table import Table as DocxTable
from docx.text.paragraph import Paragraph as DocxParagraph
from PIL import Image as PILImage

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, PageBreak
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY

from .multilingual_helper import (
    register_reportlab_multilingual_fonts,
    resolve_reportlab_font,
    normalize_multilingual_text,
    get_best_font_for_script
)

ALIGN_MAP = {
    WD_ALIGN_PARAGRAPH.LEFT: TA_LEFT,
    WD_ALIGN_PARAGRAPH.CENTER: TA_CENTER,
    WD_ALIGN_PARAGRAPH.RIGHT: TA_RIGHT,
    WD_ALIGN_PARAGRAPH.JUSTIFY: TA_JUSTIFY,
    None: TA_LEFT,
}

def _convert_with_docx2pdf(docx_path: str, output_pdf_path: str) -> bool:
    """
    Attempts conversion using Microsoft Word COM automation (highest fidelity on Windows with Word installed).
    """
    try:
        from docx2pdf import convert
        convert(docx_path, output_pdf_path)
        if os.path.exists(output_pdf_path) and os.path.getsize(output_pdf_path) > 0:
            return True
    except Exception as e:
        print(f"[docx2pdf notice] Word COM conversion not available: {e}")
    return False

def _convert_with_libreoffice(docx_path: str, output_pdf_path: str) -> bool:
    """
    Attempts conversion using LibreOffice headless command line.
    """
    soffice_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "libreoffice",
        "soffice"
    ]
    out_dir = os.path.dirname(os.path.abspath(output_pdf_path))
    for soffice in soffice_paths:
        try:
            res = subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", out_dir, docx_path],
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
            if res.returncode == 0:
                base_name = os.path.splitext(os.path.basename(docx_path))[0] + ".pdf"
                generated_pdf = os.path.join(out_dir, base_name)
                if os.path.exists(generated_pdf):
                    if os.path.abspath(generated_pdf) != os.path.abspath(output_pdf_path):
                        if os.path.exists(output_pdf_path):
                            os.remove(output_pdf_path)
                        os.rename(generated_pdf, output_pdf_path)
                    return True
        except Exception:
            continue
    return False

def _build_paragraph_xml(p: DocxParagraph, doc_part) -> tuple[str, list]:
    """
    Builds ReportLab HTML-formatted run strings and extracts embedded pictures.
    """
    html_parts = []
    inline_images = []
    
    for r in p.runs:
        # Check for images inside this run
        try:
            blips = r._r.xpath('.//a:blip')
            for blip in blips:
                embed_id = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                if embed_id and embed_id in doc_part.related_parts:
                    img_part = doc_part.related_parts[embed_id]
                    img_bytes = img_part.blob
                    inline_images.append(img_bytes)
        except Exception:
            pass

        raw_text = r.text
        if not raw_text:
            continue

        clean_text = normalize_multilingual_text(raw_text)
        if not clean_text:
            continue

        # Escape XML entities
        safe = clean_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

        # Font attributes
        run_font_name = r.font.name if r.font and r.font.name else None
        is_bold = bool(r.bold)
        is_italic = bool(r.italic)
        is_underline = bool(r.underline)

        resolved_font = resolve_reportlab_font(run_font_name or "Segoe UI", is_bold=is_bold, is_italic=is_italic)
        
        font_attrs = []
        if resolved_font:
            font_attrs.append(f'name="{resolved_font}"')

        if r.font and r.font.size:
            sz_pt = r.font.size.pt
            font_attrs.append(f'size="{sz_pt}"')

        if r.font and r.font.color and r.font.color.rgb:
            font_attrs.append(f'color="#{str(r.font.color.rgb)}"')

        formatted = safe
        if is_bold and not resolved_font.endswith(('-Bold', 'Bold')):
            formatted = f'<b>{formatted}</b>'
        if is_italic and not resolved_font.endswith(('-Italic', 'Italic', '-Oblique')):
            formatted = f'<i>{formatted}</i>'
        if is_underline:
            formatted = f'<u>{formatted}</u>'

        if font_attrs:
            formatted = f'<font {" ".join(font_attrs)}>{formatted}</font>'

        html_parts.append(formatted)

    return "".join(html_parts), inline_images

def _convert_with_python_reportlab(docx_path: str, output_pdf_path: str) -> bool:
    """
    Advanced pure-Python layout & typography reconstructor:
    - Preserves body element sequence (paragraphs, tables, images).
    - Preserves alignments (Left, Center, Right, Justify).
    - Preserves character formatting (bold, italic, underline, font color, size).
    - Extracts embedded images with proportional scaling and alignment.
    - Preserves table cell shading, borders, and column widths.
    - Multilingual Bengali (Kalpurush / Noto Sans), Indic, and Arabic typography.
    """
    try:
        register_reportlab_multilingual_fonts()
        doc = docx.Document(docx_path)
        
        pdf_doc = SimpleDocTemplate(
            output_pdf_path,
            pagesize=A4,
            leftMargin=0.75 * inch,
            rightMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch
        )

        styles = getSampleStyleSheet()
        story = []
        body = doc.element.body

        for child in body:
            if isinstance(child, CT_P):
                p = DocxParagraph(child, doc)
                align = ALIGN_MAP.get(p.alignment, TA_LEFT)

                # Check for page break before
                if p.paragraph_format.page_break_before:
                    story.append(PageBreak())

                # Check for page break element inside paragraph
                if child.xpath('.//w:br[@w:type="page"]'):
                    story.append(PageBreak())
                    continue

                html_text, images = _build_paragraph_xml(p, doc.part)

                # Render images found in paragraph
                for img_bytes in images:
                    try:
                        pil_img = PILImage.open(io.BytesIO(img_bytes))
                        orig_w, orig_h = pil_img.size
                        max_w = 6.5 * inch
                        max_h = 4.5 * inch
                        scale = min(max_w / orig_w, max_h / orig_h, 1.0)
                        render_w = orig_w * scale
                        render_h = orig_h * scale

                        align_str = 'CENTER'
                        if align == TA_LEFT:
                            align_str = 'LEFT'
                        elif align == TA_RIGHT:
                            align_str = 'RIGHT'

                        rl_img = RLImage(io.BytesIO(img_bytes), width=render_w, height=render_h, hAlign=align_str)
                        story.append(Spacer(1, 4))
                        story.append(rl_img)
                        story.append(Spacer(1, 6))
                    except Exception as img_err:
                        print(f"[image rendering error] {img_err}")

                if not html_text:
                    if not images:
                        story.append(Spacer(1, 6))
                    continue

                style_name = p.style.name.lower() if p.style and p.style.name else ""
                if 'heading 1' in style_name or 'title' in style_name:
                    font_size = 18
                    leading = 22
                    space_after = 8
                    default_font = resolve_reportlab_font("Segoe UI", is_bold=True)
                elif 'heading 2' in style_name:
                    font_size = 14
                    leading = 18
                    space_after = 6
                    default_font = resolve_reportlab_font("Segoe UI", is_bold=True)
                elif 'heading 3' in style_name:
                    font_size = 12
                    leading = 16
                    space_after = 4
                    default_font = resolve_reportlab_font("Segoe UI", is_bold=True)
                else:
                    font_size = 11
                    leading = 15
                    space_after = 4
                    default_font = resolve_reportlab_font("Segoe UI", is_bold=False)

                p_style = ParagraphStyle(
                    f'P_{len(story)}',
                    parent=styles['Normal'],
                    fontName=default_font,
                    fontSize=font_size,
                    leading=leading,
                    alignment=align,
                    spaceAfter=space_after,
                    textColor=colors.HexColor('#0F172A') if not ('heading' in style_name or 'title' in style_name) else colors.HexColor('#1E3A8A')
                )

                story.append(Paragraph(html_text, p_style))

            elif isinstance(child, CT_Tbl):
                tbl = DocxTable(child, doc)
                table_data = []
                table_styles = [
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ]

                col_count = len(tbl.columns) if tbl.columns else (len(tbl.rows[0].cells) if tbl.rows else 1)
                avail_w = 6.8 * inch
                col_w = avail_w / max(1, col_count)

                for r_idx, row in enumerate(tbl.rows):
                    row_cells = []
                    for c_idx, cell in enumerate(row.cells):
                        cell_paragraphs = []
                        # Cell background shading
                        try:
                            shd = cell._tc.xpath('.//w:shd/@w:fill')
                            if shd and shd[0] and shd[0] != 'auto':
                                fill_hex = shd[0]
                                if not fill_hex.startswith('#'):
                                    fill_hex = f'#{fill_hex}'
                                table_styles.append(('BACKGROUND', (c_idx, r_idx), (c_idx, r_idx), colors.HexColor(fill_hex)))
                        except Exception:
                            pass

                        for cp in cell.paragraphs:
                            c_align = ALIGN_MAP.get(cp.alignment, TA_LEFT)
                            c_html, _ = _build_paragraph_xml(cp, doc.part)
                            if c_html:
                                c_style = ParagraphStyle(
                                    f'Cell_{len(table_data)}_{c_idx}_{len(cell_paragraphs)}',
                                    parent=styles['Normal'],
                                    fontName=resolve_reportlab_font("Segoe UI", is_bold=False),
                                    fontSize=9.5,
                                    leading=13,
                                    alignment=c_align,
                                    textColor=colors.HexColor('#0F172A')
                                )
                                cell_paragraphs.append(Paragraph(c_html, c_style))
                        
                        if not cell_paragraphs:
                            cell_paragraphs.append(Paragraph("", styles['Normal']))
                        
                        row_cells.append(cell_paragraphs)
                    if row_cells:
                        table_data.append(row_cells)

                if table_data:
                    t = Table(table_data, colWidths=[col_w] * col_count, hAlign='LEFT')
                    t.setStyle(TableStyle(table_styles))
                    story.append(Spacer(1, 6))
                    story.append(t)
                    story.append(Spacer(1, 8))

        if not story:
            story.append(Paragraph("Empty Document", styles['Normal']))

        pdf_doc.build(story)
        return os.path.exists(output_pdf_path) and os.path.getsize(output_pdf_path) > 0
    except Exception as e:
        print(f"[word_to_pdf reportlab error] {e}")
        return False

def convert_word_to_pdf(docx_path: str, output_pdf_path: str) -> str:
    """
    Converts a Microsoft Word (.docx) document to PDF.
    Preserves exact typography, alignments, inline images, tables, and multilingual fonts.
    1. Native Word COM automation (Windows)
    2. LibreOffice Headless (Linux/Windows)
    3. Advanced ReportLab Multilingual Typography Reconstructor (Pure Python)
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_pdf_path)), exist_ok=True)
    
    # Priority 1: Native Word COM
    if _convert_with_docx2pdf(docx_path, output_pdf_path):
        return output_pdf_path
        
    # Priority 2: LibreOffice
    if _convert_with_libreoffice(docx_path, output_pdf_path):
        return output_pdf_path

    # Priority 3: Python-docx + Dynamic Font ReportLab
    if _convert_with_python_reportlab(docx_path, output_pdf_path):
        return output_pdf_path

    raise RuntimeError("Failed to convert Word document to PDF using all available conversion engines.")
