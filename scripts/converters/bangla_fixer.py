import re
import unicodedata

# Bijoy ANSI to Unicode mapping tables for legacy Bangla documents
BIJOY_PRE_KAR = {'†': 'ে', '‡': 'ৈ', '‰': 'ৈ', 'w': 'ি', '©': 'ী'}
BIJOY_POST_KAR = {'v': 'া', 'y': 'ু', 'z': 'ু', 'æ': 'ূ', '~': 'ূ', '…': 'ৃ'}

BIJOY_CONJUNCTS = {
    'cÖ': 'প্র', 'cÖkœ': 'প্রশ্ন', 'kœ': 'শ্ন', '²': 'ক্ষ', '³': 'ক্ত', 'µ': 'ক্র',
    '·': 'ঙ্ক', '¸': 'ঙ্গ', '»': 'জ্ঞ', '½': 'ঞ্চ', '¾': 'ঞ্ছ', '¿': 'ঞ্জ',
    'À': 'ঞ্ঝ', 'Á': 'ট্ট', 'Â': 'ট্ফ', 'Ã': 'ড্ড', 'Ä': 'ণ্ট', 'Å': 'ণ্ঠ',
    'Æ': 'ণ্ড', 'Ç': 'ণ্ণ', 'È': 'ত্থ', 'É': 'ত্ন', 'Ê': 'ত্ব', 'Ë': 'ত্ম',
    'Ì': 'ত্র', 'Í': 'থ্ব', 'Î': 'দ্ব', 'Ï': 'দ্ধ', 'Ð': 'দ্ব', 'Ñ': 'দ্ম',
    'Ò': 'ধ্ব', 'Ó': 'ন্ন্ট', 'Ô': 'ন্ঠ', 'Õ': 'ন্ড', 'Ö': 'ন্ত্র', '×': 'ন্থ',
    'Ø': 'ন্দ', 'Ù': 'ন্ধ', 'Ú': 'ন্ন', 'Û': 'ন্ব', 'Ü': 'ন্ম', 'Ý': 'প্ট',
    'Þ': 'প্স', 'ß': 'প্ত', 'à': 'প্ন', 'á': 'প্প', 'â': 'প্স', 'ã': 'ব্জ',
    'ä': 'ব্দ', 'å': 'ব্ধ', 'ç': 'ব্ব', 'è': 'ব্ল', 'é': 'ভ্ল', 'ê': 'ম্ন',
    'ë': 'ম্প', 'ì': 'ম্ফ', 'í': 'ম্ব', 'î': 'ম্ভ', 'ï': 'ম্ম', 'ð': 'ম্ল',
    'ñ': 'রু', 'ò': 'রূ', 'ó': 'ল্ক', 'ô': 'ল্গ', 'õ': 'ল্ট', 'ö': 'ল্ড',
    '÷': 'ল্প', 'ø': 'ল্ফ', 'ù': 'ল্ব', 'ú': 'ল্ম', 'û': 'ল্ল', 'ü': 'শ্চ',
    'ý': 'শ্ছ', 'þ': 'শ্ন', 'ÿ': 'শ্ম', '¯': 'স্', '¡': '্ব', '¢': '্ভ',
    '£': 'ঙ্ক', '¤': 'ক্ষ', '¥': 'জ্ঞ', '¦': 'ঞ্চ', '§': 'ঞ্ছ', '¨': 'ঞ্জ'
}

BIJOY_VOWELS = {
    'A': 'অ', 'Av': 'আ', 'B': 'ই', 'C': 'ঈ', 'D': 'উ', 'E': 'ঊ',
    'F': 'ঋ', 'G': 'এ', 'H': 'ঐ', 'I': 'ও', 'J': 'ঔ'
}

BIJOY_CONSONANTS = {
    'K': 'ক', 'L': 'খ', 'M': 'গ', 'N': 'ঘ', 'O': 'ঙ',
    'P': 'চ', 'Q': 'ছ', 'R': 'জ', 'S': 'ঝ', 'T': 'ঞ',
    'U': 'ট', 'V': 'ঠ', 'W': 'ড', 'X': 'ঢ', 'Y': 'ণ',
    'Z': 'ত', '_': 'থ', '`': 'দ', 'a': 'ধ', 'b': 'ন',
    'c': 'প', 'd': 'ফ', 'e': 'ব', 'f': 'ভ', 'g': 'ম',
    'h': 'য', 'i': 'র', 'j': 'ল', 'k': 'শ', 'l': 'ষ',
    'm': 'স', 'n': 'হ', 'o': 'ড়', 'p': 'ঢ়', 'q': 'য়',
    'r': 'ৎ', 's': 'ং', 't': 'ঃ', 'u': 'ঁ'
}

def is_likely_bijoy_ansi(text: str) -> bool:
    """Checks if text contains characteristic Bijoy legacy ANSI strings."""
    if not text:
        return False
    bijoy_markers = ['cÖkœ', 'evsjv', 'gv‡Wj', 'fvBgvwm', 'wK', 'Av', 'GK', 'GB']
    return any(m in text for m in bijoy_markers)

def convert_bijoy_to_unicode(text: str) -> str:
    """Converts Bijoy ANSI encoded text to clean Unicode Bangla."""
    if not text:
        return ""
    
    for k, v in BIJOY_CONJUNCTS.items():
        text = text.replace(k, v)

    for pre, kar in BIJOY_PRE_KAR.items():
        text = re.sub(re.escape(pre) + r'([A-Za-z\u0980-\u09FF])', r'\1' + kar, text)

    for k, v in BIJOY_VOWELS.items():
        text = text.replace(k, v)
    for k, v in BIJOY_CONSONANTS.items():
        text = text.replace(k, v)
    for k, v in BIJOY_POST_KAR.items():
        text = text.replace(k, v)

    return text

def fix_bangla_unicode_ordering(text: str) -> str:
    """
    Bangla Unicode Linguistic Normalization:
    1. Converts Bijoy ANSI if legacy encoding is detected.
    2. Composes split vowels (e-kar + aa-kar -> o-kar, e-kar + ou-kar -> ou-kar).
    3. Normalizes nuktas (ড+় -> ড়, ঢ+় -> ঢ়, য+় -> য়).
    4. Cleans duplicate matras, zero-width artifacts and phantom dotted circles.
    5. Normalizes to Canonical Unicode NFC.
    """
    if not text:
        return ""

    if is_likely_bijoy_ansi(text):
        text = convert_bijoy_to_unicode(text)

    # Remove dotted circle placeholder (U+25CC, U+25CB) and zero-width non-joiner artifacts
    text = text.replace('\u25cc', '').replace('\u25cb', '').replace('\ufeff', '')

    # Compose split vowels & nuktas
    text = text.replace('\u09c7\u09be', '\u09cb')  # e-kar + aa-kar -> o-kar (ো)
    text = text.replace('\u09c7\u09d7', '\u09cc')  # e-kar + ou-kar -> ou-kar (ৌ)
    text = text.replace('\u09a1\u09bc', '\u09dc')  # dda + nukta -> rra (ড়)
    text = text.replace('\u09a2\u09bc', '\u09dd')  # ddha + nukta -> rha (ঢ়)
    text = text.replace('\u09af\u09bc', '\u09df')  # ya + nukta -> yya (য়)

    # Clean standalone virama at line/word starts
    text = re.sub(r'(?:^|\s)\u09cd+', ' ', text)

    # Clean duplicate identical vowel matras (e.g. িি -> ি, াা -> া)
    text = re.sub(r'([\u09be\u09bf\u09c0\u09c1\u09c2\u09c3\u09c7\u09c8\u09cb\u09cc])\1+', r'\1', text)

    # Canonical Unicode NFC Normalization
    text = unicodedata.normalize('NFC', text)

    # Final cleanup of any stray dotted circle artifacts
    text = text.replace('\u25cc', '').replace('◌', '')

    return text
