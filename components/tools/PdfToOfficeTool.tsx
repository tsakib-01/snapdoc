'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, Copy, Check, Eye, Sparkles, Layout } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails, PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';
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

  const handleDownload = () => {
    if (!file) return;

    const baseName = file.name.replace(/\.[^/.]+$/, '');

    if (format === 'word') {
      if (wordMode === 'visual' && pages.length > 0) {
        // High-Fidelity Word Document with Exact Vector/Retina Page Layouts
        const htmlDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${baseName}</title>
<style>
  body { margin: 0; padding: 20px; background-color: #f3f4f6; font-family: Calibri, sans-serif; }
  .page-container { max-width: 820px; margin: 0 auto 30px auto; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; page-break-after: always; }
  .page-img { width: 100%; height: auto; display: block; }
  @media print {
    body { padding: 0; background: none; }
    .page-container { max-width: 100%; box-shadow: none; margin: 0; page-break-after: always; }
  }
</style>
</head>
<body>
${pages
  .map(
    (pg) => `
<div class="page-container">
  <img src="${pg.dataUrl}" class="page-img" alt="Page ${pg.pageNumber}" />
</div>`
  )
  .join('\n')}
</body>
</html>`;

        const blob = new Blob([htmlDoc], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_exact_layout.doc`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Editable Text Mode
        const htmlDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${baseName}</title>
<style>
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #111827; padding: 40px; margin: 0; }
  p { margin: 0 0 8pt 0; white-space: pre-wrap; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  td { border: 1px solid #e5e7eb; padding: 6px 10px; font-size: 10pt; }
  .page-break { page-break-after: always; height: 1px; margin: 24pt 0; border-top: 1px dashed #d1d5db; }
</style>
</head>
<body>
${extractedText
  .split('\n\n--- Page Break ---\n\n')
  .map((pageText, pIdx, arr) => {
    const lines = pageText.split('\n');
    const pageHtml = lines
      .map((line) => {
        if (!line.trim()) return '<p style="height: 10pt;"></p>';
        if (line.includes('\t')) {
          const cells = line
            .split('\t')
            .map((c) => `<td>${c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`)
            .join('');
          return `<table><tr>${cells}</tr></table>`;
        }
        return `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
      })
      .join('\n');
    return `<div>${pageHtml}</div>${pIdx < arr.length - 1 ? '<div class="page-break"></div>' : ''}`;
  })
  .join('\n')}
</body>
</html>`;

        const blob = new Blob([htmlDoc], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}.doc`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else if (format === 'excel') {
      const csvRows = extractedText
        .replace(/\n\n--- Page Break ---\n\n/g, '\n')
        .split('\n')
        .map((line) => {
          const cells = line.includes('\t') ? line.split('\t') : [line];
          return cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(',');
        })
        .join('\r\n');

      const blob = new Blob(['\uFEFF' + csvRows], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
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

