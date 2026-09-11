import os
import re
import unicodedata
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor

from .bangla_fixer import fix_bangla_unicode_ordering

# Local & Windows Fonts Directories
LOCAL_FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fonts")
WINDOWS_FONTS = r"C:\Windows\Fonts"

# Registry cache for ReportLab
_REGISTERED_RL_FONTS = {}

def clean_pdf_font_name(raw_name: str) -> str:
    """
    Cleans raw PDF font names (e.g. 'BAAAAA+NimbusRomNo9L-Regu', 'ABCDEF+Arial-BoldMT')
    into standard clean system/Word font family names.
    """
    if not raw_name:
        return "Noto Sans Bengali"

    name = re.sub(r'^[A-Za-z]{6}\+', '', raw_name.lstrip('/'))

    KNOWN_MAP = {
        'NotoSansBengali': 'Noto Sans Bengali',
        'NotoSansBengali-Regular': 'Noto Sans Bengali',
        'NotoSansBengali-Bold': 'Noto Sans Bengali',
        'NimbusRomNo9L': 'Nimbus Roman No9 L',
        'NimbusRomNo9L-Regu': 'Nimbus Roman No9 L',
        'NimbusRomNo9L-Medm': 'Nimbus Roman No9 L',
        'NimbusRomNo9L-Bold': 'Nimbus Roman No9 L',
        'NimbusSanL': 'Nimbus Sans L',
        'NimbusSanL-Regu': 'Nimbus Sans L',
        'TimesNewRoman': 'Times New Roman',
        'TimesNewRomanPS': 'Times New Roman',
        'TimesNewRomanPSMT': 'Times New Roman',
        'Times-Roman': 'Times New Roman',
        'ArialMT': 'Arial',
        'Arial-BoldMT': 'Arial',
        'Helvetica': 'Helvetica',
        'Calibri': 'Calibri',
        'Cambria': 'Cambria',
        'Georgia': 'Georgia',
        'Verdana': 'Verdana',
        'CourierNew': 'Courier New',
        'SegoeUI': 'Segoe UI',
        'SegoeUI-Bold': 'Segoe UI',
        'Kalpurush': 'Kalpurush',
        'SolaimanLipi': 'SolaimanLipi',
        'SiyamRupali': 'Siyam Rupali',
        'Vrinda': 'Vrinda',
        'NirmalaUI': 'Nirmala UI',
        'Mangal': 'Mangal',
        'Roboto': 'Roboto'
    }

    if name in KNOWN_MAP:
        return KNOWN_MAP[name]

    base = name.split('-')[0].split(',')[0]
    if base in KNOWN_MAP:
        return KNOWN_MAP[base]

    clean_base = re.sub(r'-(Regular|Regu|Bold|Italic|Oblique|BoldItalic|Roman|Medium|Light|Semibold|SemiBold|Book)$', '', name, flags=re.IGNORECASE)
    clean_base = re.sub(r'(PSMT|MT|PS)$', '', clean_base)

    if re.search(r'[a-z][A-Z]', clean_base) and ' ' not in clean_base:
        clean_base = re.sub(r'([a-z])([A-Z])', r'\1 \2', clean_base)

    clean_base = clean_base.strip()
    return clean_base if clean_base else name

def get_best_font_for_script(text: str, preferred_font: str = None) -> dict:
    """
    Analyzes text and returns the optimal font family and script metadata.
    Prioritizes Noto Sans Bengali (Google Fonts), Kalpurush, and SolaimanLipi for Bangla.
    """
    has_bengali = bool(re.search(r'[\u0980-\u09FF]', text))
    has_devanagari = bool(re.search(r'[\u0900-\u097F]', text))
    has_arabic = bool(re.search(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]', text))
    has_cjk = bool(re.search(r'[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]', text))

    base_ascii = preferred_font if (preferred_font and preferred_font.strip()) else "Segoe UI"

    if has_bengali:
        # User specified or detected font (Noto Sans Bengali / Kalpurush / SolaimanLipi)
        if preferred_font and preferred_font in ["Noto Sans Bengali", "Kalpurush", "SolaimanLipi", "Vrinda", "Siyam Rupali", "Nirmala UI"]:
            bangla_font = preferred_font
        else:
            bangla_font = "Noto Sans Bengali"

        return {
            "ascii": bangla_font,
            "cs": bangla_font,
            "fallback_cs": "Kalpurush",
            "is_complex": True,
            "is_rtl": False,
            "lang": "bn-BD"
        }
    elif has_arabic:
        return {
            "ascii": base_ascii,
            "cs": "Noto Naskh Arabic",
            "fallback_cs": "Arial",
            "is_complex": True,
            "is_rtl": True,
            "lang": "ar-SA"
        }
    elif has_devanagari:
        return {
            "ascii": base_ascii,
            "cs": "Nirmala UI",
            "fallback_cs": "Mangal",
            "is_complex": True,
            "is_rtl": False,
            "lang": "hi-IN"
        }
    elif has_cjk:
        return {
            "ascii": base_ascii,
            "cs": "Microsoft YaHei",
            "fallback_cs": "SimSun",
            "is_complex": False,
            "is_rtl": False,
            "lang": "zh-CN"
        }
    else:
        return {
            "ascii": base_ascii,
            "cs": base_ascii,
            "fallback_cs": "Segoe UI",
            "is_complex": False,
            "is_rtl": False,
            "lang": "en-US"
        }

def normalize_multilingual_text(text: str) -> str:
    """
    Applies linguistic reordering (Bangla/Indic), Unicode NFC composition,
    and removes phantom non-printable control codes.
    """
    if not text:
        return ""
    text = fix_bangla_unicode_ordering(text)
    normalized = unicodedata.normalize('NFC', text)
    clean = "".join(ch for ch in normalized if ch == '\n' or ch == '\t' or unicodedata.category(ch)[0] != 'C' or ch in ['\u200C', '\u200D'])
    return clean

def style_docx_run_multilingual(run, text: str, font_family: str = None, font_size_pt: float = None, is_bold: bool = False, is_italic: bool = False, color_rgb: tuple = None):
    """
    Sets OpenXML fonts and Complex Script tags on a python-docx run.
    Uses Noto Sans Bengali / Kalpurush / SolaimanLipi for Bangla text.
    """
    clean_font = clean_pdf_font_name(font_family) if font_family else None
    meta = get_best_font_for_script(text, preferred_font=clean_font)

    run.font.name = meta["ascii"]

    rPr = run._r.get_or_add_rPr()
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:ascii'), meta["ascii"])
    rFonts.set(qn('w:hAnsi'), meta["ascii"])
    rFonts.set(qn('w:cs'), meta["cs"])
    rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')
    rPr.append(rFonts)

    if meta["is_complex"]:
        cs_elem = OxmlElement('w:cs')
        rPr.append(cs_elem)

    if meta["is_rtl"]:
        rtl_elem = OxmlElement('w:rtl')
        rPr.append(rtl_elem)

    if font_size_pt:
        run.font.size = Pt(font_size_pt)
        szCs = OxmlElement('w:szCs')
        szCs.set(qn('w:val'), str(int(font_size_pt * 2)))
        rPr.append(szCs)

    if is_bold:
        run.bold = True
        bCs = OxmlElement('w:bCs')
        rPr.append(bCs)

    if is_italic:
        run.italic = True
        iCs = OxmlElement('w:iCs')
        rPr.append(iCs)

    if color_rgb and len(color_rgb) == 3:
        run.font.color.rgb = RGBColor(*color_rgb)

def register_reportlab_multilingual_fonts() -> dict:
    """
    Registers Noto Sans Bengali, Kalpurush, and Windows system fonts with ReportLab.
    """
    global _REGISTERED_RL_FONTS
    if _REGISTERED_RL_FONTS:
        return _REGISTERED_RL_FONTS

    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        registered = {}

        # 1. Register Local Fonts Directory
        local_fonts = {
            'Noto Sans Bengali': os.path.join(LOCAL_FONTS_DIR, 'NotoSansBengali-Regular.ttf'),
            'Noto Sans Bengali-Bold': os.path.join(LOCAL_FONTS_DIR, 'NotoSansBengali-Bold.ttf'),
            'Kalpurush': os.path.join(LOCAL_FONTS_DIR, 'Kalpurush.ttf'),
            'SolaimanLipi': os.path.join(LOCAL_FONTS_DIR, 'Kalpurush.ttf'), # fallback to Kalpurush if Solaiman not downloaded
        }

        for font_name, font_path in local_fonts.items():
            if os.path.exists(font_path):
                try:
                    pdfmetrics.registerFont(TTFont(font_name, font_path))
                    registered[font_name] = font_name
                except Exception:
                    pass

        # 2. Register Windows System Fonts
        win_fonts = {
            'Arial': 'arial.ttf',
            'Arial-Bold': 'arialbd.ttf',
            'Calibri': 'calibri.ttf',
            'Calibri-Bold': 'calibrib.ttf',
            'Times New Roman': 'times.ttf',
            'Times New Roman-Bold': 'timesbd.ttf',
            'Segoe UI': 'segoeui.ttf',
            'Segoe UI-Bold': 'segoeuib.ttf',
            'Georgia': 'georgia.ttf',
            'Kalpurush': 'kalpurush.ttf',
        }

        for font_name, font_file in win_fonts.items():
            font_path = os.path.join(WINDOWS_FONTS, font_file)
            if font_name not in registered and os.path.exists(font_path):
                try:
                    pdfmetrics.registerFont(TTFont(font_name, font_path))
                    registered[font_name] = font_name
                except Exception:
                    pass

        _REGISTERED_RL_FONTS = registered
        return _REGISTERED_RL_FONTS
    except Exception as e:
        print(f"[font registration warning] {e}")
        return {}

def resolve_reportlab_font(font_name: str, is_bold: bool = False, is_italic: bool = False) -> str:
    """
    Maps any requested font to a valid registered TrueType font or standard ReportLab PostScript font.
    Guarantees no FontNotFound / ValueError crashes during PDF generation on Linux/Docker.
    """
    registered = register_reportlab_multilingual_fonts()
    clean = clean_pdf_font_name(font_name)

    # 1. Complex scripts / Bengali
    if "bengali" in clean.lower() or "bangla" in clean.lower() or "noto" in clean.lower():
        if is_bold and 'Noto Sans Bengali-Bold' in registered:
            return 'Noto Sans Bengali-Bold'
        if 'Noto Sans Bengali' in registered:
            return 'Noto Sans Bengali'
        if 'Kalpurush' in registered:
            return 'Kalpurush'

    if "kalpurush" in clean.lower() or "solaiman" in clean.lower():
        if 'Kalpurush' in registered:
            return 'Kalpurush'
        if 'Noto Sans Bengali' in registered:
            return 'Noto Sans Bengali'

    # 2. Check if explicitly registered TrueType font
    if is_bold:
        bold_candidate = f"{clean}-Bold"
        if bold_candidate in registered:
            return bold_candidate
    if clean in registered:
        return clean

    # 3. Standard built-in ReportLab PostScript 14 Fonts (always available without TTF files)
    if "times" in clean.lower() or "nimbusrom" in clean.lower() or "serif" in clean.lower() or "roman" in clean.lower() or "georgia" in clean.lower():
        if is_bold and is_italic:
            return "Times-BoldItalic"
        if is_bold:
            return "Times-Bold"
        if is_italic:
            return "Times-Italic"
        return "Times-Roman"

    if "courier" in clean.lower() or "mono" in clean.lower() or "code" in clean.lower():
        if is_bold and is_italic:
            return "Courier-BoldOblique"
        if is_bold:
            return "Courier-Bold"
        if is_italic:
            return "Courier-Oblique"
        return "Courier"

    # 4. Default to standard ReportLab Helvetica family (built-in)
    if is_bold and is_italic:
        return "Helvetica-BoldOblique"
    if is_bold:
        return "Helvetica-Bold"
    if is_italic:
        return "Helvetica-Oblique"
    return "Helvetica"

