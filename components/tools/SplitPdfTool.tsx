'use client';

import React, { useState } from 'react';
import { Loader2, Scissors, Sparkles, AlertCircle, FileText, Check } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';
import { useProgressAction } from '@/lib/hooks/useProgressAction';
import ProcessingButton from '@/components/ui/ProcessingButton';
import { parsePageRanges } from '@/lib/pdf/splitPdf';
import { safeFetchJson } from '@/lib/utils/apiHelper';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function SplitPdfTool() {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [splitMode, setSplitMode] = useState<'range' | 'all'>('range');
  const [rangeInput, setRangeInput] = useState<string>('1-3');
  const { isProcessing, progress, startProgress, finishProgress, resetProgress } = useProgressAction();
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setError(null);
    startProgress();
    setResult(null);

    const file = files[0];
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    try {
      // 1. High Performance Client-Side Split via pdf-lib
      // Bypasses HTTP 413 "Request Entity Too Large" on large books and losslessly preserves fonts
      try {
        const { PDFDocument } = await import('pdf-lib');
        const JSZip = (await import('jszip')).default;

        const arrayBuffer = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const totalPages = srcDoc.getPageCount();

        if (splitMode === 'all') {
          const zip = new JSZip();

          for (let i = 0; i < totalPages; i++) {
            const singleDoc = await PDFDocument.create();
            const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
            singleDoc.addPage(copiedPage);
            const pageBytes = await singleDoc.save({ useObjectStreams: true });
            zip.file(`${baseName}_page_${i + 1}.pdf`, pageBytes);
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const blobUrl = URL.createObjectURL(zipBlob);

          await finishProgress(() => {
            setResult({
              success: true,
              filename: `${baseName}_pages.zip`,
              mode: 'zip-individual',
              pageCount: totalPages,
              fileSize: zipBlob.size,
              originalSize: file.size,
              mimeType: 'application/zip',
              dataUrl: blobUrl,
            });
          });
          return;
        } else {
          const selectedIndices = rangeInput
            ? parsePageRanges(rangeInput, totalPages)
            : srcDoc.getPageIndices();

          if (selectedIndices.length === 0) {
            throw new Error('No valid pages found in the entered range. Please verify page numbers.');
          }

          const outputDoc = await PDFDocument.create();
          const copiedPages = await outputDoc.copyPages(srcDoc, selectedIndices);
          copiedPages.forEach((page) => outputDoc.addPage(page));

          const pdfBytes = await outputDoc.save({ useObjectStreams: true });
          const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(pdfBlob);

          await finishProgress(() => {
            setResult({
              success: true,
              filename: `${baseName}_split.pdf`,
              mode: 'merged-range',
              pageCount: selectedIndices.length,
              fileSize: pdfBlob.size,
              originalSize: file.size,
              mimeType: 'application/pdf',
              dataUrl: blobUrl,
            });
          });
          return;
        }
      } catch (clientErr: any) {
        console.warn('Client-side split error, checking server fallback:', clientErr);

        // 2. Server API Fallback with safe JSON parsing
        const formData = new FormData();
        formData.append('file', file);
        if (splitMode === 'all') {
          formData.append('extractAllSeparate', 'true');
        } else {
          formData.append('range', rangeInput);
        }

        const res = await fetch('/api/split-pdf', {
          method: 'POST',
          body: formData,
        });

        const data = await safeFetchJson(res);

        await finishProgress(() => {
          setResult(data);
        });
      }
    } catch (err: any) {
      resetProgress();
      setError(err.message || 'Error occurred while splitting PDF.');
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="w-full space-y-6">
      {files.length === 0 && (
        <UploadZone
          accept=".pdf,application/pdf"
          files={files}
          onFilesSelected={setFiles}
          title={t('dropPdfToSplit', 'Drop PDF file to split or extract pages')}
          subtitle={t('splitSubtitle', 'Extract custom page ranges or separate all pages')}
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300">
            <div>
              <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs sm:max-w-md">{files[0].name}</p>
              <p className="text-xs text-base-content/60">{t('originalSize', 'Original Size')}: <strong>{formatBytes(files[0].size)}</strong></p>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-xs text-base-content/60 hover:text-error">
              {t('changeFile', 'Change')}
            </button>
          </div>

          {/* Split Mode Selector */}
          <div className="p-5 rounded-2xl bg-base-200/40 border border-base-300 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 block">
              {t('chooseSplitMethod', 'Choose Split Method')}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSplitMode('range')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  splitMode === 'range'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                    : 'border-base-300 bg-base-100 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-base-content">{t('extractPageRange', 'Extract Page Range')}</span>
                  {splitMode === 'range' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-base-content/60 mt-1">
                  {t('extractRangeDesc', 'Extract specific pages into one new PDF (e.g. 1-3, 5)')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('all')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  splitMode === 'all'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                    : 'border-base-300 bg-base-100 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-base-content">{t('extractAllPages', 'Extract All Pages')}</span>
                  {splitMode === 'all' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-base-content/60 mt-1">
                  {t('extractAllDesc', 'Save every page as a separate PDF bundled in a ZIP')}
                </p>
              </button>
            </div>

            {splitMode === 'range' && (
              <div className="p-4 rounded-2xl bg-base-100 border border-base-300 space-y-2 animate-in fade-in duration-100">
                <label className="text-xs font-semibold text-base-content/80 block">
                  {t('enterPageRanges', 'Enter Page Numbers or Ranges:')}
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 5, 8-10"
                  className="input input-sm input-bordered w-full rounded-xl font-bold font-mono"
                />
                <span className="text-[11px] text-base-content/50 block">
                  Use commas for multiple pages and hyphens for ranges (e.g. 1-5, 8, 11-12)
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-error text-xs rounded-2xl py-3 shadow-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <ProcessingButton
            onClick={handleProcess}
            isProcessing={isProcessing}
            progress={progress}
            loadingLabel={t('splitting', 'Splitting')}
          >
            <Scissors className="w-5 h-5" />
            {splitMode === 'range' ? `${t('splitPdfBtn', 'Split & Extract PDF')} (${rangeInput})` : `${t('splitPdfBtn', 'Split & Extract PDF')} (ZIP)`}
          </ProcessingButton>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-base-200/50 border border-base-300 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <Scissors className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base text-base-content">{t('pdfSplitCompleted', 'PDF Split Completed')}</h4>
              <p className="text-xs text-base-content/60 mt-0.5">
                Output: {result.filename} ({formatBytes(result.fileSize)})
              </p>
            </div>
          </div>

          <ResultCard
            originalSize={result.originalSize}
            newSize={result.fileSize}
            filename={result.filename}
            dataUrl={result.dataUrl}
            format={result.mode === 'zip-individual' ? 'ZIP' : 'PDF'}
            extraInfo={`${result.pageCount} ${t('pages', 'Pages')}`}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
