import re

with open('lib/i18n/allMissingUiTranslations.ts', 'r', encoding='utf-8') as f:
    text = f.read()

en_part = text[text.find('"en": {'):text.find('"es": {')]
keys = set(re.findall(r'"([^"]+)":', en_part))

print(f"Total keys in EN: {len(keys)}")

test_keys = [
    'standardBrowserViewer', 'newTab', 'switchToInteractive', 'previousPage', 'nextPage',
    'fitPage', 'fitWidth', 'switchToFitWidth', 'switchToFitPage', 'zoomOut', 'resetTo100',
    'zoomIn', 'openInNewTab', 'renderingPreview', 'previewUnavailableInline', 'openInViewer',
    'tryBrowserFrame', 'alreadyOptimal', 'quality100Preserved', 'pdfOptimalTitle',
    'currentSize', 'pages', 'status', 'fullyOptimized', 'compressAnotherPdf', 'downloadFile',
    'extremeCompression', 'maxReduction', 'extremeCompressionDesc', 'recommended', 'bestBalance',
    'recommendedCompressionDesc', 'lowCompression', 'highAccuracy', 'lowCompressionDesc',
    'mergedFrom', 'files', 'file', 'preview', 'mergeAnother', 'fileDetails', 'fileName',
    'fileSize', 'created', 'startOverClearAll', 'addMorePdfs', 'reverseOrder', 'gridView',
    'listView', 'removeDocument', 'zoomFirstPage', 'moveEarlier', 'moveLater', 'clickToViewPage',
    'moveUp', 'moveDown', 'remove', 'resizeTopLeft', 'resizeTopRight', 'resizeBottomRight',
    'resizeBottomLeft', 'resizeTop', 'resizeBottom', 'resizeLeft', 'resizeRight',
    'decreaseTopMargin', 'increaseTopMargin', 'decreaseBottomMargin', 'increaseBottomMargin',
    'decreaseLeftMargin', 'increaseLeftMargin', 'decreaseRightMargin', 'increaseRightMargin',
    'formatPageNOfTotal', 'formatNOfTotal', 'formatPageN', 'decreaseFontSize', 'increaseFontSize',
    'customFontColorPicker', 'customBgColorPicker', 'transparentBackground', 'colorBlack',
    'colorDarkGray', 'colorWhite', 'colorBlue', 'colorRed', 'colorGreen', 'whiteBadge',
    'blackBadge', 'blueBadge', 'lightGray', 'yellowHighlight', 'scaleDownMax',
    'popularSocialPresets', 'creatingZip', 'downloadAllZip', 'resizeMore', 'removeImage',
    'addMorePhotos', 'livePreview', 'vector600Dpi', 'uploadSealTitle', 'uploadSealFormats',
    'browseFiles', 'autoRemoveWhiteBg', 'autoRemoveWhiteBgDesc', 'uploadedSealPreview',
    'removingBackground', 'noImageUploadedYet', 'pageColon', 'opacityColon', 'customColorPicker',
    'moveToPage', 'rotateLeft15', 'rotateRight15', 'resetRotation0', 'duplicate', 'delete',
    'dragToRotate', 'sealCompanyPlaceholder', 'sealTitlePlaceholder', 'sealRegPlaceholder',
    'sealAuthorizedPlaceholder', 'clickDragCropArea', 'smartAutoFitActive', 'smartAutoFitDesc',
    'moveBackward', 'moveForward', 'supportedImageFormats', 'pageA4Standard', 'pageLetterStandard',
    'dropScannedPdfTitle', 'dropScannedPdfSubtitle', 'recognitionLanguage', 'selectPrimaryLanguage',
    'whatWillHappen', 'fullView', 'detectedWords', 'ocrTextPlaceholder', 'uploadPdfForAi',
    'localNeuralAiDesc', 'processingFailed', 'uploadAnotherDoc', 'tryLabel', 'askQuestionAboutDoc',
    'askInChat', 'pdfSplitCompleted', 'dropImageToCompress', 'dropImageToCompressSubtitle',
    'preparingImagePreview', 'supportsFormatsShort', 'watermarkPlaceholder', 'errorZeroBytes',
    'errorInvalidPdf', 'errorUnsupportedImage', 'errorFileTooLarge', 'maxFilesPrefix',
    'documentLanguage', 'dropJpgToPdf', 'dropJpgToPdfSubtitle', 'dropImagesToPdf',
    'dropImagesToPdfSubtitle', 'deletePdfPages', 'deletePdfPagesDesc', 'extractPdfPages',
    'extractPdfPagesDesc', 'rotatePdf', 'rotatePdfDesc', 'splitPdf', 'splitPdfDesc', 'ready'
]

present = [k for k in test_keys if k in keys]
missing = [k for k in test_keys if k not in keys]

print(f"Present: {len(present)}")
print(f"Missing: {len(missing)}")
print("Missing keys:", missing)
