import os
import sys
import subprocess
import docx
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib import colors
from reportlab.lib.units import inch

from .multilingual_helper import (
    register_reportlab_multilingual_fonts,
    resolve_reportlab_font,
    normalize_multilingual_text,
    get_best_font_for_script
)

def _convert_with_docx2pdf(docx_path: str, output_pdf_path: str) -> bool:
    try:
        from docx2pdf import convert
        convert(docx_path, output_pdf_path)
        if os.path.exists(output_pdf_path) and os.path.getsize(output_pdf_path) > 0:
            return True
    except Exception as e:
        print(f"[docx2pdf fallback notice] Word COM conversion failed: {e}")
    return False

def _convert_with_libreoffice(docx_path: str, output_pdf_path: str) -> bool:
    soffice_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "soffice"
    ]
    out_dir = os.path.dirname(os.path.abspath(output_pdf_path))
    for soffice in soffice_paths:
        try:
            res = subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", out_dir, docx_path],
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
            if res.returncode == 0:
                base_name = os.path.splitext(os.path.basename(docx_path))[0] + ".pdf"
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

def _convert_with_python_reportlab(docx_path: str, output_pdf_path: str) -> bool:
    """
    Fallback docx parser and PDF builder using python-docx + reportlab.
    Preserves exact font families (NimbusRomNo9L, Arial, Calibri, Segoe UI, Georgia, Kalpurush).
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

        for p_idx, p in enumerate(doc.paragraphs):
            text = normalize_multilingual_text(p.text.strip())
            if not text:
                story.append(Spacer(1, 6))
                continue

            # Detect font specified on runs or paragraph style
            run_font = None
            is_bold = False
            is_italic = False
            for r in p.runs:
                if r.font and r.font.name:
                    run_font = r.font.name
                if r.bold:
                    is_bold = True
                if r.italic:
                    is_italic = True

            style_name = p.style.name.lower() if p.style and p.style.name else ""
            if 'heading 1' in style_name or 'title' in style_name:
                is_bold = True
                font_size = 18
                leading = 24
            elif 'heading 2' in style_name:
                is_bold = True
                font_size = 14
                leading = 19
            elif 'heading 3' in style_name:
                is_bold = True
                font_size = 12
                leading = 16
            else:
                font_size = 10.5
                leading = 15

            resolved_font = resolve_reportlab_font(run_font or "Segoe UI", is_bold=is_bold, is_italic=is_italic)
            safe_text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

            p_style = ParagraphStyle(
                f'DocxP_{p_idx}',
                parent=styles['Normal'],
                fontName=resolved_font,
                fontSize=font_size,
                leading=leading,
                spaceAfter=6,
                textColor=colors.HexColor('#0F172A') if not ('heading' in style_name or 'title' in style_name) else colors.HexColor('#1E3A8A')
            )
            story.append(Paragraph(safe_text, p_style))

        for t_idx, tbl in enumerate(doc.tables):
            table_data = []
            for row in tbl.rows:
                row_cells = []
                for cell in row.cells:
                    cell_font = None
                    for cp in cell.paragraphs:
                        for cr in cp.runs:
                            if cr.font and cr.font.name:
                                cell_font = cr.font.name
                    r_font = resolve_reportlab_font(cell_font or "Segoe UI", is_bold=False)
                    cell_text = normalize_multilingual_text(cell.text.strip()).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    c_style = ParagraphStyle(
                        f'Cell_{t_idx}_{len(row_cells)}',
                        parent=styles['Normal'],
                        fontName=r_font,
                        fontSize=9.5,
                        leading=13,
                        textColor=colors.HexColor('#0F172A')
                    )
                    row_cells.append(Paragraph(cell_text, c_style))
                if row_cells:
                    table_data.append(row_cells)

            if table_data:
                t = Table(table_data, hAlign='LEFT')
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ]))
                story.append(Spacer(1, 6))
                story.append(t)
                story.append(Spacer(1, 10))

        if not story:
            story.append(Paragraph("Empty Document", styles['Normal']))

        pdf_doc.build(story)
        return True
    except Exception as e:
        print(f"[reportlab multilingual error] {e}")
        return False

def convert_word_to_pdf(docx_path: str, output_pdf_path: str) -> str:
    """
    Converts a Word (.docx) document to PDF.
    Preserves exact typography and fonts with Word COM and Multilingual TrueType ReportLab fallback.
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

    raise RuntimeError("Failed to convert Word document to PDF using all available engines.")
