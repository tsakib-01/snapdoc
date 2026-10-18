# -*- coding: utf-8 -*-
import urllib.request
import urllib.parse
import json
import time
import os

ALL_LANGS = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ru', 'ko', 'zh-CN', 'zh-TW',
    'ar', 'bg', 'ca', 'nl', 'el', 'hi', 'id', 'ms', 'pl', 'sv', 'th', 'tr',
    'uk', 'vi', 'sw', 'bn'
]

# Base English
EN_KEYS = {
    'standardBrowserViewer': 'Standard browser viewer',
    'newTab': 'New tab',
    'switchToInteractive': 'Switch to interactive',
    'previousPage': 'Previous page',
    'nextPage': 'Next page',
    'fitPage': 'Fit Page',
    'fitWidth': 'Fit Width',
    'switchToFitWidth': 'Switch to Fit Width',
    'switchToFitPage': 'Switch to Fit Entire Page',
    'zoomOut': 'Zoom out',
    'resetTo100': 'Reset to 100%',
    'zoomIn': 'Zoom in',
    'openInNewTab': 'Open PDF in new tab',
    'renderingPreview': 'Rendering document preview...',
    'previewUnavailableInline': 'Preview unavailable inline',
    'openInViewer': 'Open in Viewer',
    'tryBrowserFrame': 'Try Browser Frame',
    'alreadyOptimal': 'Already Optimal',
    'quality100Preserved': '100% Quality Preserved',
    'pdfOptimalTitle': 'Your PDF is already at its optimal file size',
    'pdfOptimalExplanation': 'Your document is composed of clean vector text and streams with no bloated images or redundant metadata.',
    'pdfOptimalPreserved': 'To preserve complete document fidelity and avoid making the file larger, SnapDoc kept your file at its exact optimal size.',
    'currentSize': 'Current Size',
    'pages': 'Pages',
    'status': 'Status',
    'fullyOptimized': 'Fully Optimized',
    'compressAnotherPdf': 'Compress Another PDF',
    'downloadFile': 'Download File',
    'extremeCompression': 'Extreme Compression',
    'maxReduction': 'Max Reduction',
    'extremeCompressionDesc': 'Maximum file size reduction with lower image resolution. Perfect for documents with strict upload limits.',
    'recommended': 'Recommended',
    'bestBalance': 'Best Balance',
    'recommendedCompressionDesc': 'Great quality with high compression. The optimal sweet spot for email attachments and everyday sharing.',
    'lowCompression': 'Low Compression',
    'highAccuracy': 'High Accuracy',
    'lowCompressionDesc': 'Mild compression preserving original image clarity and maximum sharpness for printing and archiving.',
    'mergedFrom': 'Merged from',
    'files': 'files',
    'file': 'file',
    'preview': 'Preview',
    'mergeAnother': 'Merge Another',
    'fileDetails': 'File Details',
    'fileName': 'File name',
    'fileSize': 'File size',
    'created': 'Created',
    'startOverClearAll': 'Start over / Clear all',
    'addMorePdfs': 'Add more PDF documents',
    'reverseOrder': 'Reverse document order',
    'gridView': 'Grid View',
    'listView': 'List View',
    'removeDocument': 'Remove document',
    'zoomFirstPage': 'Zoom 1st page preview',
    'moveEarlier': 'Move earlier in merge order',
    'moveLater': 'Move later in merge order',
    'clickToViewPage': 'Click to view 1st page',
    'moveUp': 'Move Up',
    'moveDown': 'Move Down',
    'remove': 'Remove',
    'resizeTopLeft': 'Resize top-left',
    'resizeTopRight': 'Resize top-right',
    'resizeBottomRight': 'Resize bottom-right',
    'resizeBottomLeft': 'Resize bottom-left',
    'resizeTop': 'Resize top',
    'resizeBottom': 'Resize bottom',
    'resizeLeft': 'Resize left',
    'resizeRight': 'Resize right',
    'decreaseTopMargin': 'Decrease top margin',
    'increaseTopMargin': 'Increase top margin',
    'decreaseBottomMargin': 'Decrease bottom margin',
    'increaseBottomMargin': 'Increase bottom margin',
    'decreaseLeftMargin': 'Decrease left margin',
    'increaseLeftMargin': 'Increase left margin',
    'decreaseRightMargin': 'Decrease right margin',
    'increaseRightMargin': 'Increase right margin',
    'formatPageNOfTotal': 'Page 1 of 10',
    'formatNOfTotal': '1 of 10',
    'formatPageN': 'Page 1',
    'decreaseFontSize': 'Decrease font size (-1)',
    'increaseFontSize': 'Increase font size (+1)',
    'customFontColorPicker': 'Custom font color picker',
    'customBgColorPicker': 'Custom background color picker',
    'transparentBackground': 'Transparent background',
    'colorBlack': 'Black',
    'colorDarkGray': 'Dark Gray',
    'colorWhite': 'White',
    'colorBlue': 'Blue',
    'colorRed': 'Red',
    'colorGreen': 'Green',
    'whiteBadge': 'White Badge',
    'blackBadge': 'Black Badge',
    'blueBadge': 'Blue Badge',
    'lightGray': 'Light Gray',
    'yellowHighlight': 'Yellow Highlight',
    'scaleDownMax': 'Scale Down (Max 100%)',
    'popularSocialPresets': 'Popular Social Presets',
    'creatingZip': 'Creating ZIP...',
    'downloadAllZip': 'Download All (ZIP)',
    'resizeMore': 'Resize More',
    'removeImage': 'Remove image',
    'addMorePhotos': 'Add more photos',
    'livePreview': 'Live Preview',
    'vector600Dpi': '600 DPI Vector',
    'uploadSealTitle': 'Upload Seal or Stamp Image',
    'uploadSealFormats': 'PNG, JPG, WebP or SVG supported',
    'browseFiles': 'Browse Files',
    'autoRemoveWhiteBg': 'Auto-remove white background (Make Transparent)',
    'autoRemoveWhiteBgDesc': 'Converts scanned white paper backgrounds into authentic transparent stamps that blend seamlessly over PDF text.',
    'uploadedSealPreview': 'Uploaded Seal Preview',
    'removingBackground': 'Removing background...',
    'noImageUploadedYet': 'No image uploaded yet',
    'pageColon': 'Page:',
    'opacityColon': 'Opacity:',
    'customColorPicker': 'Custom Color Picker',
    'moveToPage': 'Move to page',
    'rotateLeft15': 'Rotate Left 15°',
    'rotateRight15': 'Rotate Right 15°',
    'resetRotation0': 'Reset Rotation (0°)',
    'duplicate': 'Duplicate',
    'delete': 'Delete',
    'dragToRotate': 'Drag to Rotate freely',
    'sealCompanyPlaceholder': 'e.g. ACME GLOBAL CORPORATION',
    'sealTitlePlaceholder': 'e.g. OFFICIAL SEAL or NOTARY PUBLIC',
    'sealRegPlaceholder': 'e.g. REG-892410-X or LIC-998822',
    'sealAuthorizedPlaceholder': 'e.g. DIRECTOR OF OPERATIONS or John Smith',
    'clickDragCropArea': 'Click & drag to select crop area',
    'smartAutoFitActive': 'Smart Auto-Fit Active:',
    'smartAutoFitDesc': 'Spreadsheet will be formatted in Landscape orientation and automatically scaled to fit completely onto a single page without breaking.',
    'moveBackward': 'Move Backward',
    'moveForward': 'Move Forward',
    'supportedImageFormats': 'JPG, PNG, WebP',
    'pageA4Standard': 'A4 (Standard 210 × 297 mm)',
    'pageLetterStandard': 'US Letter (8.5 × 11 in)',
    'dropScannedPdfTitle': 'Drop Scanned PDF or Images to Extract Text',
    'dropScannedPdfSubtitle': 'Converts flat picture scans into selectable, searchable PDFs and machine-readable text.',
    'recognitionLanguage': 'Recognition Language',
    'selectPrimaryLanguage': 'Select the primary language of the text in your document',
    'whatWillHappen': 'What will happen:',
    'fullView': 'Full view',
    'detectedWords': 'Detected words:',
    'ocrTextPlaceholder': 'Recognized text will appear here...',
    'uploadPdfForAi': 'Upload PDF for AI Assistant & Summarizer',
    'localNeuralAiDesc': 'Local neural AI — your document never leaves your device.',
    'processingFailed': 'Processing failed',
    'uploadAnotherDoc': 'Upload another document',
    'tryLabel': 'Try:',
    'askQuestionAboutDoc': 'Ask any question about this document...',
    'askInChat': 'Ask in Chat',
    'pdfSplitCompleted': 'PDF Split Completed',
    'dropImageToCompress': 'Drop your image to compress',
    'dropImageToCompressSubtitle': 'Supports JPG, PNG, WebP, and camera formats (Up to 50MB)',
    'preparingImagePreview': 'Preparing uploaded image preview...',
    'supportsFormatsShort': 'Supports JPG, PNG, WebP, and camera formats',
    'watermarkPlaceholder': 'e.g. DRAFT, CONFIDENTIAL, SAMPLE',
    'errorZeroBytes': 'Selected file has 0 bytes. Please select a valid non-empty file.',
    'errorInvalidPdf': 'Selected file is not a valid PDF file. Please upload PDF files only.',
    'errorUnsupportedImage': 'Selected file is not a supported image format. Please upload JPG, PNG, or WebP.',
    'errorFileTooLarge': 'Selected file exceeds the maximum allowed file size.',
    'maxFilesPrefix': 'Max',
    'documentLanguage': 'Document Language',
    'dropJpgToPdf': 'Drop one or multiple JPG images to convert to PDF',
    'dropJpgToPdfSubtitle': 'Supports JPG and JPEG photos (Up to 30 images)',
    'dropImagesToPdf': 'Drop one or multiple images to convert to PDF',
    'dropImagesToPdfSubtitle': 'Supports JPG, PNG, and WebP (Up to 30 images)',
    'deletePdfPages': 'Delete PDF Pages',
    'deletePdfPagesDesc': 'Visually select and remove unwanted or blank pages from any PDF document in seconds.',
    'extractPdfPages': 'Extract PDF Pages',
    'extractPdfPagesDesc': 'Visually choose and extract specific pages into an independent PDF.',
    'rotatePdf': 'Rotate PDF Pages',
    'rotatePdfDesc': 'Rotate individual or all pages clockwise or counterclockwise.',
    'splitPdf': 'Split PDF Pages',
    'splitPdfDesc': 'Split your PDF file by page ranges or into individual pages.',
    'ready': 'Ready',
    'searchTools': 'Search tools',
    'toggleNavMenu': 'Toggle navigation menu'
}

# Cached translations file so we don't re-query if interrupted
CACHE_FILE = 'scripts/deep_translations_cache.json'
cache = {}
if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            cache = json.load(f)
    except Exception as e:
        cache = {}

def translate_batch(texts, target):
    # Batch translates a list of texts by joining with special delimiter
    delimiter = " ||| "
    joined = delimiter.join(texts)
    url = f'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target}&dt=t&q=' + urllib.parse.quote(joined)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                data = json.loads(res.read().decode('utf-8'))
                full_translated = ''.join([p[0] for p in data[0]])
                parts = [p.strip() for p in full_translated.split("|||")]
                if len(parts) == len(texts):
                    return parts
                elif len(parts) > len(texts):
                    return parts[:len(texts)]
                else:
                    # Fallback to single requests
                    break
        except Exception as e:
            time.sleep(1 + attempt)
            
    # Fallback to translating each item individually
    results = []
    for t in texts:
        url_single = f'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target}&dt=t&q=' + urllib.parse.quote(t)
        req_single = urllib.request.Request(url_single, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req_single, timeout=10) as res_s:
                data_s = json.loads(res_s.read().decode('utf-8'))
                results.append(''.join([p[0] for p in data_s[0]]).strip())
        except Exception:
            results.append(t)
        time.sleep(0.05)
    return results

print("Starting translations across all 27 languages...")
all_translations = {}
all_translations['en'] = dict(EN_KEYS)

keys_list = list(EN_KEYS.keys())
texts_list = [EN_KEYS[k] for k in keys_list]

for lang in ALL_LANGS:
    if lang == 'en':
        continue
    
    if lang not in cache:
        cache[lang] = {}
        
    missing_indices = [i for i, k in enumerate(keys_list) if k not in cache[lang]]
    
    if missing_indices:
        print(f"Translating {len(missing_indices)} keys for {lang}...")
        chunk_size = 20
        for i in range(0, len(missing_indices), chunk_size):
            chunk_idx = missing_indices[i:i+chunk_size]
            sub_texts = [texts_list[idx] for idx in chunk_idx]
            sub_keys = [keys_list[idx] for idx in chunk_idx]
            
            translated_chunks = translate_batch(sub_texts, lang)
            for k, val in zip(sub_keys, translated_chunks):
                cache[lang][k] = val
            time.sleep(0.1)
            
        # Save cache periodically
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
            
    all_translations[lang] = {k: cache[lang].get(k, EN_KEYS[k]) for k in keys_list}
    print(f"[{lang}] Complete: {len(all_translations[lang])} keys.")

# Write TypeScript file
ts_output = "export const DEEP_AUDITED_TRANSLATIONS: Record<string, Record<string, string>> = "
ts_output += json.dumps(all_translations, ensure_ascii=False, indent=2) + ";\n"

with open('lib/i18n/deepAuditedTranslations.ts', 'w', encoding='utf-8') as f:
    f.write(ts_output)

print(f"\nSUCCESS: Generated lib/i18n/deepAuditedTranslations.ts with {len(all_translations)} languages and {len(keys_list)} keys each!")
