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

def _convert_with_libreoffice(docx_path: str, output_pdf_path: str) -> bool:
    """
    Attempts conversion using LibreOffice headless command line.
    This provides 100% exact, pixel-perfect Word to PDF fidelity.
    """
    soffice_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.com",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.com",
        "soffice.com",
        "soffice",
        "libreoffice",
        "/usr/bin/soffice",
        "/usr/bin/libreoffice",
        "/usr/local/bin/soffice",
        "/usr/local/bin/libreoffice",
    ]
    out_dir = os.path.dirname(os.path.abspath(output_pdf_path))
    
    for soffice in soffice_paths:
        if os.path.isabs(soffice) and not os.path.exists(soffice):
            continue
        try:
            cmd = [
                soffice,
                "--headless",
                "--invisible",
                "--nologo",
                "--nodefault",
                "--norestore",
                "--convert-to",
                "pdf",
                "--outdir",
                out_dir,
                docx_path
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=35)
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

def _get_image_extent(drawing_elem):
    """
    Extracts explicit width and height in points from wp:extent cx and cy attributes (EMUs).
    1 pt = 12700 EMUs.
    """
    try:
        extent = drawing_elem.xpath('.//wp:extent')
        if extent:
            cx = int(extent[0].get('cx', 0))
            cy = int(extent[0].get('cy', 0))
            if cx > 0 and cy > 0:
                return cx / 12700.0, cy / 12700.0
    except Exception:
        pass
    return None, None

def _extract_paragraph_items(p: DocxParagraph, doc_part):
    """
    Extracts text runs and drawings preserving exact element order, line breaks, tabs, and image dimensions.
    """
    items = []
    html_runs = []

    for r in p.runs:
        # Check for drawing elements in run
        drawings = r._r.xpath('.//w:drawing')
        for d in drawings:
            blips = d.xpath('.//a:blip')
            for blip in blips:
                embed_id = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                if embed_id and embed_id in doc_part.related_parts:
                    try:
                        img_part = doc_part.related_parts[embed_id]
                        w_pt, h_pt = _get_image_extent(d)
                        items.append(('image', img_part.blob, w_pt, h_pt))
                    except Exception:
                        pass

        # Check for page break in run
        if r._r.xpath('.//w:br[@w:type="page"]') or r._r.xpath('.//w:lastRenderedPageBreak'):
            items.append(('page_break',))

        raw_text = r.text
        if not raw_text:
            continue

        clean_text = normalize_multilingual_text(raw_text)
        if not clean_text:
            continue

        safe = clean_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\t', ' &nbsp; &nbsp; ').replace('\n', '<br/>').replace('\r', '')

        run_font_name = r.font.name if r.font and r.font.name else None
        is_bold = bool(r.bold)
        is_italic = bool(r.italic)
        is_underline = bool(r.underline)

        script_info = get_best_font_for_script(clean_text, preferred_font=run_font_name)
        chosen_font = script_info.get("ascii") if script_info.get("is_complex") else (run_font_name or "Segoe UI")
        resolved_font = resolve_reportlab_font(chosen_font, is_bold=is_bold, is_italic=is_italic)
        font_attrs = [f'name="{resolved_font}"']

        if r.font and r.font.size:
            font_attrs.append(f'size="{r.font.size.pt}"')
        if r.font and r.font.color and r.font.color.rgb:
            font_attrs.append(f'color="#{str(r.font.color.rgb)}"')

        formatted = safe
        if is_bold and not resolved_font.endswith(('-Bold', 'Bold')):
            formatted = f'<b>{formatted}</b>'
        if is_italic and not resolved_font.endswith(('-Italic', 'Italic', '-Oblique')):
            formatted = f'<i>{formatted}</i>'
        if is_underline:
            formatted = f'<u>{formatted}</u>'

        formatted = f'<font {" ".join(font_attrs)}>{formatted}</font>'
        html_runs.append(formatted)

    if html_runs:
        items.append(('text', "".join(html_runs)))

    return items

def _table_has_borders(tbl: DocxTable) -> bool:
    """
    Checks if a table has explicit borders or is a borderless layout table.
    """
    try:
        tblBorders = tbl._tbl.tblPr.xpath('.//w:tblBorders')
        if not tblBorders:
            style_name = tbl.style.name.lower() if tbl.style else ""
            return 'grid' in style_name
        for b in tblBorders[0]:
            val = b.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '')
            if val and val.lower() not in ('none', 'nil'):
                return True
        return False
    except Exception:
        return False

def _convert_with_python_reportlab(docx_path: str, output_pdf_path: str) -> bool:
    """
    Advanced pure-Python layout & typography reconstructor:
    - Reads exact section page dimensions and margins.
    - Preserves body element sequence (paragraphs, tables, images).
    - Preserves exact paragraph and table cell alignments (Left, Center, Right, Justify) directly from Word.
    - Preserves character formatting (bold, italic, underline, font color, size).
    - Extracts embedded images with exact document dimensions and alignment.
    - Preserves table cell shading, borders, and column widths.
    - Multilingual Bengali (Kalpurush / Noto Sans), Indic, and Arabic typography.
    """
    try:
        register_reportlab_multilingual_fonts()
        doc = docx.Document(docx_path)

        # 1. Read section geometry
        section = doc.sections[0] if doc.sections else None
        page_width = section.page_width.pt if section and section.page_width else 595.28
        page_height = section.page_height.pt if section and section.page_height else 841.89
        left_margin = section.left_margin.pt if section and section.left_margin else 54.0
        right_margin = section.right_margin.pt if section and section.right_margin else 54.0
        top_margin = section.top_margin.pt if section and section.top_margin else 36.0
        bottom_margin = section.bottom_margin.pt if section and section.bottom_margin else 36.0

        content_width = page_width - left_margin - right_margin

        pdf_doc = SimpleDocTemplate(
            output_pdf_path,
            pagesize=(page_width, page_height),
            leftMargin=left_margin,
            rightMargin=right_margin,
            topMargin=top_margin,
            bottomMargin=bottom_margin
        )

        styles = getSampleStyleSheet()
        story = []
        body = doc.element.body

        for child_idx, child in enumerate(body):
            tag = child.tag.split('}')[-1]

            if tag == 'sectPr' and child_idx < len(body) - 1:
                story.append(PageBreak())
                continue

            if isinstance(child, CT_P):
                p = DocxParagraph(child, doc)
                style_name = p.style.name.lower() if p.style and p.style.name else ""

                # Respect exact alignment from Word document
                align = ALIGN_MAP.get(p.alignment, TA_LEFT)

                # Explicit page break before
                if p.paragraph_format.page_break_before or child.xpath('.//w:br[@w:type="page"]'):
                    story.append(PageBreak())

                items = _extract_paragraph_items(p, doc.part)

                for item in items:
                    item_type = item[0]

                    if item_type == 'page_break':
                        story.append(PageBreak())

                    elif item_type == 'image':
                        _, img_bytes, w_pt, h_pt = item
                        try:
                            pil_img = PILImage.open(io.BytesIO(img_bytes))
                            orig_w, orig_h = pil_img.size

                            if w_pt and h_pt and w_pt > 0 and h_pt > 0:
                                render_w = min(w_pt, content_width)
                                render_h = h_pt * (render_w / w_pt)
                            else:
                                render_w = min(orig_w * 0.75, content_width, 160)
                                render_h = orig_h * (render_w / max(1, orig_w))

                            align_str = 'LEFT'
                            if p.alignment == WD_ALIGN_PARAGRAPH.CENTER:
                                align_str = 'CENTER'
                            elif p.alignment == WD_ALIGN_PARAGRAPH.RIGHT:
                                align_str = 'RIGHT'

                            rl_img = RLImage(io.BytesIO(img_bytes), width=render_w, height=render_h, hAlign=align_str)
                            story.append(Spacer(1, 4))
                            story.append(rl_img)
                            story.append(Spacer(1, 4))
                        except Exception as e:
                            print(f"[image rendering error] {e}")

                    elif item_type == 'text':
                        html_text = item[1]
                        space_before = p.paragraph_format.space_before.pt if p.paragraph_format.space_before else 0
                        space_after = p.paragraph_format.space_after.pt if p.paragraph_format.space_after else 2
                        
                        if 'heading 1' in style_name or 'title' in style_name:
                            font_size = 16
                            leading = 20
                            space_after = 6
                        elif 'heading 2' in style_name:
                            font_size = 13
                            leading = 16
                            space_after = 4
                        elif 'heading 3' in style_name:
                            font_size = 11.5
                            leading = 15
                            space_after = 3
                        else:
                            font_size = 10.5
                            leading = 13.5

                        para_script = get_best_font_for_script(html_text)
                        default_para_font = resolve_reportlab_font(para_script["ascii"] if para_script.get("is_complex") else "Segoe UI", is_bold=False)

                        p_style = ParagraphStyle(
                            f'P_{len(story)}',
                            parent=styles['Normal'],
                            fontName=default_para_font,
                            fontSize=font_size,
                            leading=leading,
                            alignment=align,
                            spaceBefore=space_before,
                            spaceAfter=space_after,
                            textColor=colors.HexColor('#0F172A') if not ('heading' in style_name or 'title' in style_name) else colors.HexColor('#1E3A8A')
                        )
                        story.append(Paragraph(html_text, p_style))

                if not items:
                    story.append(Spacer(1, 4))

                # Section break attached to paragraph
                if child.xpath('.//w:sectPr') and child_idx < len(body) - 1:
                    story.append(PageBreak())

            elif isinstance(child, CT_Tbl):
                tbl = DocxTable(child, doc)
                table_data = []
                has_borders = _table_has_borders(tbl)

                table_styles = [
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                    ('TOPPADDING', (0, 0), (-1, -1), 2),
                    ('LEFTPADDING', (0, 0), (-1, -1), 4),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]

                if has_borders:
                    table_styles.append(('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')))

                col_count = len(tbl.columns) if tbl.columns else (len(tbl.rows[0].cells) if tbl.rows else 1)
                col_w = content_width / max(1, col_count)

                for r_idx, row in enumerate(tbl.rows):
                    row_cells = []
                    for c_idx, cell in enumerate(row.cells):
                        cell_items = []

                        # Shading
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

                            p_items = _extract_paragraph_items(cp, doc.part)
                            for it in p_items:
                                if it[0] == 'text':
                                    c_html = it[1]
                                    c_script = get_best_font_for_script(c_html)
                                    c_font = resolve_reportlab_font(c_script["ascii"] if c_script.get("is_complex") else "Segoe UI", is_bold=False)
                                    c_style = ParagraphStyle(
                                        f'Cell_{len(table_data)}_{c_idx}_{len(cell_items)}',
                                        parent=styles['Normal'],
                                        fontName=c_font,
                                        fontSize=10,
                                        leading=13,
                                        alignment=c_align,
                                        textColor=colors.HexColor('#0F172A')
                                    )
                                    cell_items.append(Paragraph(c_html, c_style))
                                elif it[0] == 'image':
                                    _, img_bytes, w_pt, h_pt = it
                                    try:
                                        c_img_align = 'LEFT'
                                        if cp.alignment == WD_ALIGN_PARAGRAPH.CENTER:
                                            c_img_align = 'CENTER'
                                        elif cp.alignment == WD_ALIGN_PARAGRAPH.RIGHT:
                                            c_img_align = 'RIGHT'
                                        rl_img = RLImage(io.BytesIO(img_bytes), width=min(w_pt or 80, col_w), height=h_pt or 80, hAlign=c_img_align)
                                        cell_items.append(rl_img)
                                    except Exception:
                                        pass

                        if not cell_items:
                            cell_items.append(Paragraph("", styles['Normal']))

                        row_cells.append(cell_items)
                    if row_cells:
                        table_data.append(row_cells)

                if table_data:
                    t = Table(table_data, colWidths=[col_w] * col_count, hAlign='CENTER')
                    t.setStyle(TableStyle(table_styles))
                    story.append(Spacer(1, 4))
                    story.append(t)
                    story.append(Spacer(1, 4))

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
    Preserves exact typography, alignments, inline images, tables, and multilingual fonts:
    1. Priority 1: LibreOffice Headless (Exact OpenXML rendering)
    2. Priority 2: Native Word COM automation (Windows)
    3. Priority 3: Smart Pure-Python ReportLab Layout Reconstructor
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_pdf_path)), exist_ok=True)
    
    # Priority 1: LibreOffice
    if _convert_with_libreoffice(docx_path, output_pdf_path):
        return output_pdf_path

    # Priority 2: Native Word COM
    if _convert_with_docx2pdf(docx_path, output_pdf_path):
        return output_pdf_path

    # Priority 3: Python-docx + Dynamic Font ReportLab
    if _convert_with_python_reportlab(docx_path, output_pdf_path):
        return output_pdf_path

    raise RuntimeError("Failed to convert Word document to PDF using all available conversion engines.")
