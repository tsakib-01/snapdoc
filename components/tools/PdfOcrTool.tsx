'use client';

import React, { useState } from 'react';
import {
  ScanText,
  Download,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  FileSearch,
  FileText,
  Sparkles,
  Layers,
  Globe,
  AlertCircle,
  Eye,
  FileCheck2,
  X,
  BookOpen,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import PdfPreviewModalViewer from '@/components/ui/PdfPreviewModalViewer';
import { formatBytes } from '@/lib/utils/formatters';
import { scrollToTool } from '@/lib/utils/scrollHelper';
import { processPdfOcr, PdfOcrResult } from '@/lib/browser-converters/pdf-ocr';
import { extractPdfThumbnails } from '@/lib/pdf/pdfThumbnailHelper';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Español (Spanish)' },
  { code: 'fra', name: 'Français (French)' },
  { code: 'deu', name: 'Deutsch (German)' },
  { code: 'ita', name: 'Italiano (Italian)' },
  { code: 'por', name: 'Português (Portuguese)' },
  { code: 'jpn', name: '日本語 (Japanese)' },
  { code: 'rus', name: 'Русский (Russian)' },
  { code: 'kor', name: '한국어 (Korean)' },
  { code: 'chi_sim', name: '中文 (简体) (Chinese Simplified)' },
  { code: 'chi_tra', name: '中文 (繁體) (Chinese Traditional)' },
  { code: 'ara', name: 'العربية (Arabic)' },
  { code: 'bul', name: 'Български (Bulgarian)' },
  { code: 'cat', name: 'Català (Catalan)' },
  { code: 'nld', name: 'Nederlands (Dutch)' },
  { code: 'ell', name: 'Ελληνικά (Greek)' },
  { code: 'hin', name: 'हिन्दी (Hindi)' },
  { code: 'ind', name: 'Bahasa Indonesia (Indonesian)' },
  { code: 'msa', name: 'Bahasa Melayu (Malay)' },
  { code: 'pol', name: 'Polski (Polish)' },
  { code: 'swe', name: 'Svenska (Swedish)' },
  { code: 'tha', name: 'ภาษาไทย (Thai)' },
  { code: 'tur', name: 'Türkçe (Turkish)' },
  { code: 'ukr', name: 'Українська (Ukrainian)' },
  { code: 'vie', name: 'Tiếng Việt (Vietnamese)' },
  { code: 'swa', name: 'Kiswahili (Swahili)' },
  { code: 'ben', name: 'বাংলা (Bengali)' },
];

export default function PdfOcrTool() {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('eng');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ stage: string; percent: number }>({
    stage: 'Initializing...',
    percent: 0,
  });
  const [result, setResult] = useState<PdfOcrResult | null>(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    const selected = selectedFiles[0];
    setFile(selected);
    setResult(null);
    setError(null);

    // Provide instant staged preview of first page
    if (selected.type.startsWith('image/')) {
      setStagedPreview(URL.createObjectURL(selected));
    } else {
      try {
        const { thumbnails } = await extractPdfThumbnails(selected, { maxPages: 1, scale: 0.5 });
        if (thumbnails[0]?.dataUrl) {
          setStagedPreview(thumbnails[0].dataUrl);
        }
      } catch (err) {
        console.warn('Staged preview extraction skipped:', err);
      }
    }
  };

  const handleRunOcr = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProgress({ stage: 'Starting Optical Character Recognition...', percent: 5 });

    try {
      const ocrResult = await processPdfOcr(file, {
        language,
        onProgress: (p) => setProgress(p),
      });

      setResult(ocrResult);
      setEditedText(ocrResult.fullText);
      setSelectedPageIndex(0);
      scrollToTool({ force: true });
    } catch (err: any) {
      console.error('OCR Processing error:', err);
      setError(err?.message || 'Optical Character Recognition failed. Ensure the document is readable.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    const textToCopy = editedText || result?.fullText || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const text = editedText || result.fullText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const baseName = (file?.name || 'document').replace(/\.[^./\\]+$/, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_extracted_text.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setStagedPreview(null);
    setResult(null);
    setError(null);
    setEditedText('');
    scrollToTool();
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Upload & Options Section */}
      {!file && !result && (
        <div className="space-y-6">
          <UploadZone
            accept="application/pdf,image/*"
            files={file ? [file] : []}
            onFilesSelected={handleFileSelected}
            title={t('dropScannedPdfTitle', 'Drop Scanned PDF or Images to Extract Text')}
            subtitle={t('dropScannedPdfSubtitle', 'Converts flat picture scans into selectable, searchable PDFs and machine-readable text.')}
          />

          {/* Language Selector Card */}
          <div className="p-5 rounded-2xl bg-base-200/50 border border-base-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-base-content">{t('recognitionLanguage', 'Recognition Language')}</h4>
                <p className="text-xs text-base-content/60">
                  {t('selectPrimaryLanguage', 'Select the primary language of the text in your document')}
                </p>
              </div>
            </div>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="select select-bordered select-sm rounded-xl font-medium text-xs w-full sm:w-auto"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 2. File Staged -> Ready to OCR */}
      {file && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300">
            <div className="flex items-center gap-3 truncate">
              {stagedPreview ? (
                <div className="w-11 h-14 rounded-lg overflow-hidden border border-base-300 bg-white shrink-0 shadow-xs flex items-center justify-center p-0.5">
                  <img src={stagedPreview} alt="Preview" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ScanText className="w-5 h-5" />
                </div>
              )}
              <div className="truncate">
                <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs sm:max-w-md">
                  {file.name}
                </p>
                <p className="text-xs text-base-content/60">
                  Size: <strong>{formatBytes(file.size)}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              disabled={isProcessing}
              className="btn btn-ghost btn-xs text-base-content/60 hover:text-error shrink-0"
            >
              {t('changeFile', 'Change')}
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                {t('recLanguage', 'OCR Language')}
              </span>
              <select
                value={language}
                disabled={isProcessing}
                onChange={(e) => setLanguage(e.target.value)}
                className="select select-bordered select-xs rounded-xl font-medium text-xs"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5 text-xs text-base-content/80">
              <div className="flex items-center gap-2 font-bold text-primary">
                <Sparkles className="w-4 h-4" />
                <span>{t('whatWillHappen', 'What will happen:')}</span>
              </div>
              <p>
                1. Every scanned page image will be analyzed to detect printed characters and words.
              </p>
              <p>
                2. An invisible, selectable text layer will be embedded into the PDF so you can search, copy, and highlight text with your cursor.
              </p>
              <p>
                3. Plain machine-readable text will be extracted for one-click copy and text export.
              </p>
            </div>

            {error && (
              <div className="alert alert-error text-xs rounded-2xl py-3 shadow-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {isProcessing ? (
              <div className="space-y-3 p-4 rounded-2xl bg-base-200/50 border border-base-300">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {progress.stage}
                  </span>
                  <span>{progress.percent}%</span>
                </div>
                <progress
                  className="progress progress-primary w-full h-2 rounded-full"
                  value={progress.percent}
                  max="100"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRunOcr}
                className="btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/20 gap-2 h-auto min-h-[3rem] py-3 px-3 text-center leading-snug flex items-center justify-center"
              >
                <ScanText className="w-5 h-5 shrink-0" />
                <span>{t('startOcr', 'Start OCR & Extract Text')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Results Section */}
      {result && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Header Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-base-100 border border-primary/30 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-base-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-md">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-white whitespace-nowrap shrink-0 shadow-sm">
                      OCR Completed
                    </span>
                    <span className="text-xs text-base-content/60 font-medium whitespace-nowrap">
                      Searchable & Selectable
                    </span>
                  </div>
                  <h3 className="text-base sm:text-xl font-extrabold text-base-content mt-1">
                    Text extracted & searchable PDF generated!
                  </h3>
                </div>
              </div>

              {/* Stats Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-sm badge-outline font-semibold text-xs">
                  {result.pageCount} {result.pageCount === 1 ? 'Page' : 'Pages'}
                </span>
                <span className="badge badge-sm badge-outline font-semibold text-xs">
                  {result.wordCount.toLocaleString()} Words
                </span>
                <span className="badge badge-sm badge-outline font-semibold text-xs">
                  {result.charCount.toLocaleString()} Characters
                </span>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <a
                href={result.searchablePdfUrl}
                download={result.filename}
                className="btn btn-primary btn-md rounded-2xl gap-2 font-bold px-6 shadow-lg shadow-primary/20 w-full sm:flex-1 text-white h-auto min-h-[2.75rem] py-2.5 text-center leading-snug flex items-center justify-center"
              >
                <FileSearch className="w-4 h-4 shrink-0" />
                <span>{t('download', 'Download')} Searchable PDF</span>
              </a>

              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="btn btn-ghost border border-base-300 btn-md rounded-2xl gap-2 font-bold px-5 text-base-content hover:bg-base-200 w-full sm:w-auto h-auto min-h-[2.75rem] py-2.5 text-center leading-snug flex items-center justify-center"
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span>{t('preview', 'Preview')}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="btn btn-outline btn-md rounded-2xl gap-2 font-bold px-5 w-full sm:w-auto h-auto min-h-[2.75rem] py-2.5 text-center leading-snug flex items-center justify-center"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>{t('download', 'Download')} .TXT</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className={`btn btn-md rounded-2xl gap-2 font-bold px-5 w-full sm:w-auto h-auto min-h-[2.75rem] py-2.5 text-center leading-snug flex items-center justify-center transition-all ${
                  copied ? 'btn-success text-white' : 'btn-ghost border border-base-300'
                }`}
              >
                {copied ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
                <span>{copied ? t('copied', 'Copied!') : t('copyText', 'Copy Text')}</span>
              </button>
            </div>
          </div>

          {/* Interactive Multi-Page / Side-by-Side Text Viewer */}
          <div className="p-6 sm:p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-base-200">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h4 className="font-extrabold text-sm text-base-content">
                  Machine-Readable Text Editor
                </h4>
              </div>

              {/* Page Selector Tabs if multi-page */}
              {result.pages.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
                  <span className="text-[11px] text-base-content/50 uppercase font-bold mr-1">
                    Jump to:
                  </span>
                  {result.pages.map((p, idx) => (
                    <button
                      key={p.pageNum}
                      type="button"
                      onClick={() => {
                        setSelectedPageIndex(idx);
                        // Update text area view if viewing per page
                      }}
                      className={`btn btn-xs rounded-xl ${
                        selectedPageIndex === idx
                          ? 'btn-primary text-white'
                          : 'btn-ghost text-base-content/70'
                      }`}
                    >
                      Page {p.pageNum}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Split View: Left Thumbnail Preview, Right Full Text Area */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
              {/* Left: Thumbnail of current page */}
              {result.pages[selectedPageIndex] && (
                <div className="md:col-span-4 flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-base-content/60">
                      Scanned Page Preview ({selectedPageIndex + 1} of {result.pages.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPreviewModal(true)}
                      className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{t('fullView', 'Full view')}</span>
                    </button>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden border border-base-300 bg-base-200/50 shadow-inner min-h-[220px] max-h-[350px] flex items-center justify-center p-2">
                    {result.pages[selectedPageIndex].thumbnail ? (
                      <img
                        src={result.pages[selectedPageIndex].thumbnail}
                        alt={`Page ${selectedPageIndex + 1}`}
                        className="max-h-[330px] w-auto object-contain rounded-lg shadow-sm bg-white"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2.5 text-base-content/50 p-4">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-xs font-semibold text-base-content/70">{t('loading', 'Loading...')}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-base-content/60 px-1">
                    <span>{t('detectedWords', 'Detected words:')}</span>
                    <strong className="text-base-content font-mono">
                      {result.pages[selectedPageIndex].wordCount}
                    </strong>
                  </div>
                </div>
              )}

              {/* Right: Editable Textarea */}
              <div className="md:col-span-8 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-base-content/50">
                    {t('extractedText', 'Extracted Text (Editable)')}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="btn btn-ghost btn-xs text-primary gap-1"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? t('copied', 'Copied') : t('copy', 'Copy')}</span>
                  </button>
                </div>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={14}
                  className="textarea textarea-bordered w-full rounded-2xl font-mono text-xs leading-relaxed p-4 bg-base-200/30 border-base-300 focus:border-primary focus:bg-base-100 transition-all resize-y"
                  placeholder={t('ocrTextPlaceholder', 'Recognized text will appear here...')}
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-base-200">
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-ghost btn-sm rounded-xl gap-2 text-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('ocrAnother', 'OCR Another Document')}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="btn btn-primary btn-sm rounded-xl text-white gap-2 font-bold px-6 shadow-md shadow-primary/20 text-xs"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? t('copied', 'Copied to Clipboard') : t('copyText', 'Copy Full Text')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Searchable PDF Preview Modal */}
      {showPreviewModal && result?.searchablePdfUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="relative bg-base-100 rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 max-w-4xl w-full h-[92dvh] sm:h-[85vh] flex flex-col gap-2 sm:gap-3 shadow-2xl border border-base-300 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-base-200 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 mr-2">
                <FileSearch className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <h5 className="font-bold text-xs sm:text-base text-base-content truncate">
                  {result.filename}
                </h5>
                <span className="badge badge-xs sm:badge-sm font-semibold shrink-0 hidden sm:inline-flex">{result.pageCount} Pages</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <a
                  href={result.searchablePdfUrl}
                  download={result.filename}
                  className="btn btn-xs btn-primary font-bold gap-1 rounded-lg text-white px-2 sm:px-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('download', 'Download')}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="btn btn-ghost btn-xs btn-circle"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0 bg-base-200/50 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col p-1.5 sm:p-2">
              <PdfPreviewModalViewer dataUrl={result.searchablePdfUrl} filename={result.filename} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
