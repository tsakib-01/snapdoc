'use client';

import React, { useState } from 'react';
import { FileCode, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, FileText, Table, Sparkles } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';
import { scrollToTool } from '@/lib/utils/scrollHelper';

import { convertDocumentDirect } from '@/lib/conversionEngine';
import { convertExcelToPdf } from '@/lib/browser-converters/excel-to-pdf';
import { useProgressAction } from '@/lib/hooks/useProgressAction';
import ProcessingButton from '@/components/ui/ProcessingButton';
import { safeFetchJson } from '@/lib/utils/apiHelper';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface DocToPdfToolProps {
  initialFormat?: 'txt' | 'csv' | 'html' | 'word' | 'excel';
  title?: string;
  subtitle?: string;
}

export default function DocToPdfTool({
  initialFormat = 'txt',
  title,
  subtitle,
}: DocToPdfToolProps) {
  const { t } = useLanguage();

  const defaultTitle =
    initialFormat === 'html'
      ? t('htmlToPdf', 'Convert HTML to PDF')
      : initialFormat === 'csv'
      ? t('csvToPdf', 'Convert CSV to PDF')
      : initialFormat === 'excel'
      ? t('excelToPdf', 'Convert Excel to PDF')
      : initialFormat === 'word'
      ? t('wordToPdf', 'Convert Word to PDF')
      : t('txtToPdf', 'Convert TXT to PDF');

  const defaultSubtitle = t('docToPdfDesc', 'Convert Word, Excel, TXT, CSV, or HTML documents into clean, professional PDF files.');

  const resolvedTitle = title ? t(title, title) : defaultTitle;
  const resolvedSubtitle = subtitle ? t(subtitle, subtitle) : defaultSubtitle;

  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [format, setFormat] = useState<'txt' | 'csv' | 'html'>(
    initialFormat === 'csv' || initialFormat === 'excel' ? 'csv' : 'txt'
  );
  const { isProcessing, progress, startProgress, finishProgress, resetProgress } = useProgressAction();
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!file && !textContent.trim()) return;
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    startProgress();
    setError(null);

    try {
      // 1. Word to PDF (.docx / .doc)
      if (
        file &&
        (file.name.toLowerCase().endsWith('.docx') ||
          file.name.toLowerCase().endsWith('.doc') ||
          initialFormat === 'word')
      ) {
        const result = await convertDocumentDirect('word-to-pdf', file);
        await finishProgress(() => {
          setResultData({
            dataUrl: result.url,
            filename: result.filename,
            size: result.size,
          });
        });
        return;
      }

      // 2. Excel / CSV to PDF (.xlsx / .xls / .csv)
      if (
        file &&
        (file.name.toLowerCase().endsWith('.xlsx') ||
          file.name.toLowerCase().endsWith('.xls') ||
          file.name.toLowerCase().endsWith('.csv') ||
          initialFormat === 'excel')
      ) {
        const result = await convertExcelToPdf(file);
        await finishProgress(() => {
          setResultData({
            dataUrl: result.dataUrl,
            filename: result.filename,
            size: result.size,
          });
        });
        return;
      }

      // 3. General Document / Text to PDF
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      if (textContent) {
        formData.append('textContent', textContent);
      }
      formData.append('format', format);

      const res = await fetch('/api/convert-doc', {
        method: 'POST',
        body: formData,
      });

      const data = await safeFetchJson(res);

      await finishProgress(() => {
        setResultData({
          dataUrl: data.dataUrl,
          filename: data.filename,
          size: data.size,
        });
      });
    } catch (err: any) {
      console.error(err);
      resetProgress();
      setError(err.message || 'Error converting document.');
    }
  };

  const handleReset = () => {
    setFile(null);
    setTextContent('');
    setResultData(null);
    setError(null);
    scrollToTool();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file && !resultData && (
        <div className="space-y-6">
          <UploadZone
            accept=".xlsx,.xls,.docx,.doc,.txt,.csv,.html,.rtf"
            maxFiles={1}
            maxSizeMb={20}
            title={resolvedTitle}
            subtitle={resolvedSubtitle}
            onFilesSelected={(files) => setFile(files[0])}
          />

          <div className="p-5 sm:p-6 rounded-2xl bg-base-200/40 border border-base-300 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-base-content/70">
              <FileCode className="w-4 h-4 text-primary" />
              <span>{t('orPasteDirectly', 'Or Paste Raw Text / CSV directly:')}</span>
            </div>
            <textarea
              rows={5}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder={t('pasteTextPlaceholder', 'Paste plain text or comma-separated CSV rows here to instantly generate a PDF...')}
              className="textarea textarea-bordered w-full rounded-2xl text-xs font-mono bg-base-100"
            />
            {error && (
              <div className="alert alert-error text-xs rounded-2xl">
                <span>{error}</span>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleProcess}
                disabled={!textContent.trim() || isProcessing}
                className="btn btn-primary btn-sm rounded-xl gap-2 shadow-md shadow-primary/20"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('converting', 'Converting...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('convertImagesToPdf', 'Convert Pasted Text to PDF')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {file && !resultData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                {file.name.endsWith('.csv') ? <Table className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-base-content">{file.name}</h3>
                <p className="text-xs text-base-content/60">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm btn-circle" title={t('reset', 'Reset')}>
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>
                <strong>{t('smartAutoFitActive', 'Smart Auto-Fit Active:')}</strong>{' '}
                {t('smartAutoFitDesc', 'Spreadsheet will be formatted in Landscape orientation and automatically scaled to fit completely onto a single page without breaking.')}
              </span>
            </div>
          )}

          {error && (
            <div className="alert alert-error text-xs rounded-2xl">
              <span>{error}</span>
            </div>
          )}

          <div className="pt-4 border-t border-base-200">
            <ProcessingButton
              onClick={handleProcess}
              isProcessing={isProcessing}
              progress={progress}
              loadingLabel={t('converting', 'Converting Document')}
            >
              <span>{t('convertImagesToPdf', 'Convert to PDF')}</span>
              <ArrowRight className="w-4 h-4" />
            </ProcessingButton>
          </div>
        </div>
      )}

      {resultData && (
        <ResultCard
          newSize={resultData.size}
          originalSize={file?.size || resultData.size}
          filename={resultData.filename}
          dataUrl={resultData.dataUrl}
          format="PDF"
          title={t('fileReadyTitle', 'Your document has been converted successfully!')}
          subtitle={t('fileReadyDesc', 'Your document has been transformed into a clean, high-fidelity PDF. You can now download your file below.')}
          resetLabel={t('processAnother', 'Convert Another Document')}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
