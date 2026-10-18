'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, Copy, Check, Eye, Globe } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails, PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';
import { convertDocumentDirect } from '@/lib/conversionEngine';
import { convertPdfToExcel } from '@/lib/browser-converters/pdf-to-excel';
import { convertTextToExcel } from '@/lib/browser-converters/text-to-excel';
import { formatBytes } from '@/lib/utils/formatters';
import { scrollToTool } from '@/lib/utils/scrollHelper';
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

interface PdfToOfficeToolProps {
  targetFormat?: 'excel' | 'txt' | 'ocr';
  title?: string;
  subtitle?: string;
}

export default function PdfToOfficeTool({
  targetFormat = 'excel',
  title = 'Convert PDF to Excel / Text',
  subtitle = 'Extract text and content from your PDF documents directly in the browser.',
}: PdfToOfficeToolProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'excel' | 'txt' | 'ocr'>(targetFormat);
  const [language, setLanguage] = useState<string>('eng');
  const [pages, setPages] = useState<PdfPageThumbnail[]>([]);
  const [extractedText, setExtractedText] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setProcessing(true);
    setError(null);
    setExtractedText('');
    setPages([]);

    try {
      const { thumbnails, extractedText: pageTexts } = await extractPdfThumbnails(selectedFile, { scale: 1.5, extractText: true });
      setPages(thumbnails);
      const combined = (pageTexts || []).join('\n\n--- Page Break ---\n\n').trim();

      if (!combined) {
        setExtractedText(t('noDirectTextFound', '(No direct selectable text found in this PDF. It may contain scanned images or custom font subsets.)'));
      } else {
        setExtractedText(combined);
      }
      scrollToTool();
    } catch (err: any) {
      console.error(err);
      setError(t('couldNotExtractText', 'Could not extract text from PDF. Ensure the file is not encrypted.'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!file) return;

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setProcessing(true);
    setError(null);

    try {
      const cleanTxt = extractedText.replace(/\n*---\s*Page Break\s*---\n*/gi, '\n\n').trim();
      if (format === 'excel') {
        const result = targetFormat === 'ocr' && cleanTxt
          ? await convertTextToExcel(cleanTxt)
          : await convertPdfToExcel(file, { ocrFallback: true, language });
        const a = document.createElement('a');
        a.href = result.dataUrl;
        a.download = result.filename;
        a.click();
        setProcessing(false);
        return;
      } else {
        const blob = new Blob([cleanTxt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const txtFilename = `${baseName}.txt`;
        a.href = url;
        a.download = txtFilename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Download export error:', err);
      setError('Error generating office document: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setFile(null);
    setPages([]);
    setExtractedText('');
    setError(null);
    scrollToTool();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file && (
        <UploadZone
          accept=".pdf,application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title={t('uploadPdf', title)}
          subtitle={t('dropPdfToExtract', subtitle)}
          onFilesSelected={(files) => handleFileSelected(files[0])}
        />
      )}

      {processing && (
        <div className="py-8 text-center space-y-4">
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
          <h3 className="font-bold text-base">{t('processingDocumentPages', 'Processing Document Pages & Layout...')}</h3>
          <p className="text-xs text-base-content/60">{t('extractingHighRes', 'Extracting high-resolution visual layout and structured streams')}</p>
        </div>
      )}

      {file && !processing && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-base-content">{file.name}</h3>
                <p className="text-xs text-base-content/60">{formatBytes(file.size)} • {pages.length} {t('pages', 'Pages')}</p>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm btn-circle" title={t('reset', 'Reset')}>
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Extracted Text Content preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                {t('extractedDocContent', 'Extracted Document Content')}
              </span>
              <button
                onClick={handleCopy}
                className="btn btn-ghost btn-xs gap-1.5 text-xs text-primary"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('copied', 'Copied!') : t('copyText', 'Copy Text')}</span>
              </button>
            </div>

            <textarea
              readOnly
              rows={10}
              value={extractedText}
              className="textarea textarea-bordered w-full rounded-2xl text-xs font-mono bg-base-200/50 leading-relaxed"
            />
          </div>

          {error && (
            <div className="alert alert-error text-xs rounded-2xl">
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-base-200">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setFormat('excel')}
                className={`btn btn-sm h-auto min-h-[2rem] py-1.5 px-3 rounded-xl text-xs font-semibold leading-normal ${format === 'excel' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Excel (.xlsx)
              </button>
              <button
                onClick={() => setFormat('txt')}
                className={`btn btn-sm h-auto min-h-[2rem] py-1.5 px-3 rounded-xl text-xs font-semibold leading-normal ${format === 'txt' || format === 'ocr' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Text (.txt)
              </button>

              <div className="flex items-center gap-1.5 bg-base-200/60 rounded-xl px-2.5 py-1 text-xs">
                <Globe className="w-3.5 h-3.5 text-base-content/60" />
                <select
                  aria-label={t('documentLanguage', 'Document Language')}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="select select-ghost select-xs text-xs font-medium focus:bg-transparent"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="btn btn-primary px-6 sm:px-8 gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto font-bold h-auto min-h-[2.75rem] py-2.5 leading-snug flex items-center justify-center text-center text-xs sm:text-sm"
            >
              <Download className="w-4 h-4" />
              <span>
                {format === 'excel'
                  ? t('downloadExcel', 'Download Extracted Excel (.xlsx)')
                  : t('downloadText', 'Download Extracted Text (.txt)')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

