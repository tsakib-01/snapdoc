'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, Copy, Check, Eye, Sparkles, Layout } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails, PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';
import { createWordDocx, createExcelWorkbook } from '@/lib/office/officeExportHelper';
import { convertDocumentDirect } from '@/lib/conversionEngine';
import { formatBytes } from '@/lib/utils/formatters';

interface PdfToOfficeToolProps {
  targetFormat?: 'word' | 'excel' | 'txt' | 'ocr';
  title?: string;
  subtitle?: string;
}

export default function PdfToOfficeTool({
  targetFormat = 'word',
  title = 'Convert PDF to Word / Text',
  subtitle = 'Extract text and content from your PDF documents directly in the browser.',
}: PdfToOfficeToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'word' | 'excel' | 'txt' | 'ocr'>(targetFormat);
  const [wordMode, setWordMode] = useState<'visual' | 'text'>('visual');
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
      const { thumbnails, extractedText: pageTexts } = await extractPdfThumbnails(selectedFile, { scale: 1.5 });
      setPages(thumbnails);
      const combined = (pageTexts || []).join('\n\n--- Page Break ---\n\n').trim();

      if (!combined) {
        setExtractedText('(No direct selectable text found in this PDF. It may contain scanned images or custom font subsets.)');
      } else {
        setExtractedText(combined);
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not extract text from PDF. Ensure the file is not encrypted.');
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
      if (format === 'excel') {
        const result = await convertDocumentDirect('pdf-to-excel', file);
        const a = document.createElement('a');
        a.href = result.url;
        a.download = result.filename;
        a.click();
        setProcessing(false);
        return;
      } else if (format === 'word') {
        const result = await convertDocumentDirect('pdf-to-word', file);
        const a = document.createElement('a');
        a.href = result.url;
        a.download = result.filename;
        a.click();
        setProcessing(false);
        return;
      } else {
        const cleanTxt = extractedText.replace(/\n\n--- Page Break ---\n\n/g, '\n\n');
        const blob = new Blob([cleanTxt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}.txt`;
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
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file && (
        <UploadZone
          accept="application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title={title}
          subtitle={subtitle}
          onFilesSelected={(files) => handleFileSelected(files[0])}
        />
      )}

      {processing && (
        <div className="py-8 text-center space-y-4">
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
          <h3 className="font-bold text-base">Processing Document Pages & Layout...</h3>
          <p className="text-xs text-base-content/60">Extracting high-resolution visual layout and structured streams</p>
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
                <p className="text-xs text-base-content/60">{formatBytes(file.size)} • {pages.length} Pages</p>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm btn-circle">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Word Conversion Mode Toggle */}
          {format === 'word' && (
            <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-primary" />
                  Word Document Output Mode
                </span>
                <span className="text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800">
                  {wordMode === 'visual' ? '100% Exact Layout Guaranteed' : 'Editable Plain Text'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWordMode('visual')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    wordMode === 'visual'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-base-300 bg-base-100 hover:bg-base-200/50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-base-content">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Exact Visual Layout (.doc)</span>
                  </div>
                  <p className="text-[11px] text-base-content/60 mt-1">
                    Preserves exact Bengali/complex fonts, two columns, questions, tables, and colors without broken letters.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setWordMode('text')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    wordMode === 'text'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-base-300 bg-base-100 hover:bg-base-200/50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-base-content">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>Editable Raw Text (.doc)</span>
                  </div>
                  <p className="text-[11px] text-base-content/60 mt-1">
                    Converts extractable Unicode paragraphs into regular editable text.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Extracted Text Content preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                Extracted Document Content
              </span>
              <button
                onClick={handleCopy}
                className="btn btn-ghost btn-xs gap-1.5 text-xs text-primary"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFormat('word')}
                className={`btn btn-xs rounded-xl ${format === 'word' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Word (.doc)
              </button>
              <button
                onClick={() => setFormat('txt')}
                className={`btn btn-xs rounded-xl ${format === 'txt' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Text (.txt)
              </button>
              <button
                onClick={() => setFormat('excel')}
                className={`btn btn-xs rounded-xl ${format === 'excel' ? 'btn-primary' : 'btn-ghost'}`}
              >
                CSV / Excel
              </button>
            </div>

            <button
              onClick={handleDownload}
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto font-bold"
            >
              <Download className="w-4 h-4" />
              <span>
                {format === 'word'
                  ? wordMode === 'visual'
                    ? 'Download Word (Exact Layout)'
                    : 'Download Word (.doc)'
                  : `Download Extracted ${format.toUpperCase()}`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

