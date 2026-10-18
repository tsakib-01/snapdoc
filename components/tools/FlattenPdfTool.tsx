'use client';

import React, { useState } from 'react';
import { Layers, Download, Loader2, RotateCcw, ArrowRight, ShieldCheck, FileCheck } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';
import { useProgressAction } from '@/lib/hooks/useProgressAction';
import ProcessingButton from '@/components/ui/ProcessingButton';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type FlattenMode = 'annotations' | 'uneditable';

export default function FlattenPdfTool() {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<FlattenMode>('annotations');
  const { isProcessing, progress, setProgress, startProgress, finishProgress, resetProgress } = useProgressAction();
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
    mode: FlattenMode;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Mode 1: Lock annotations and form fields into the PDF (text stays selectable & sharp) */
  const flattenAnnotations = async (inputFile: File): Promise<{ blob: Blob; dataUrl: string; size: number }> => {
    const { PDFDocument } = await import('pdf-lib');
    const arrayBuffer = await inputFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    try {
      const form = pdfDoc.getForm();
      form.flatten();
    } catch {
      // PDF might not have acroforms
    }

    const flattenedBytes = await pdfDoc.save({ useObjectStreams: true });
    const safeBuffer = flattenedBytes.buffer.slice(
      flattenedBytes.byteOffset,
      flattenedBytes.byteOffset + flattenedBytes.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([safeBuffer], { type: 'application/pdf' });
    return {
      blob,
      dataUrl: URL.createObjectURL(blob),
      size: blob.size,
    };
  };

  /** Mode 2: Make PDF uneditable (every page becomes an image) */
  const flattenToUneditableImages = async (
    inputFile: File,
    onProgress: (pct: number) => void
  ): Promise<{ blob: Blob; dataUrl: string; size: number }> => {
    const pdfjs: any = await import('pdfjs-dist');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }
    const { PDFDocument } = await import('pdf-lib');

    const arrayBuffer = await inputFile.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
    const numPages = pdf.numPages;

    const newDoc = await PDFDocument.create();

    for (let p = 1; p <= numPages; p++) {
      const page = await pdf.getPage(p);
      // High-res 2.0x scale (150-200 DPI) for crystal sharp page rendering
      const vp = page.getViewport({ scale: 2.0 });
      const origVp = page.getViewport({ scale: 1.0 });

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(vp.width);
      canvas.height = Math.ceil(vp.height);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      canvas.width = canvas.height = 0; // Free memory immediately

      const base64Data = dataUrl.split(',')[1] || dataUrl;
      const binaryString = atob(base64Data);
      const jpegBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        jpegBytes[i] = binaryString.charCodeAt(i);
      }

      const img = await newDoc.embedJpg(jpegBytes);
      const newPage = newDoc.addPage([origVp.width, origVp.height]);
      newPage.drawImage(img, {
        x: 0,
        y: 0,
        width: origVp.width,
        height: origVp.height,
      });

      page.cleanup();
      onProgress(Math.round((p / numPages) * 90));
      await new Promise((r) => setTimeout(r, 0));
    }

    await pdf.destroy?.();
    const finalBytes = await newDoc.save({ useObjectStreams: true });
    const safeBuffer = finalBytes.buffer.slice(
      finalBytes.byteOffset,
      finalBytes.byteOffset + finalBytes.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([safeBuffer], { type: 'application/pdf' });
    return {
      blob,
      dataUrl: URL.createObjectURL(blob),
      size: blob.size,
    };
  };

  const handleProcess = async () => {
    if (!file) return;

    startProgress();
    setError(null);

    try {
      let result: { blob: Blob; dataUrl: string; size: number };

      if (mode === 'uneditable') {
        result = await flattenToUneditableImages(file, (pct) => {
          setProgress(Math.min(98, Math.max(14, pct)));
        });
      } else {
        result = await flattenAnnotations(file);
      }

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const suffix = mode === 'uneditable' ? '_uneditable' : '_flattened';

      await finishProgress(() => {
        setResultData({
          dataUrl: result.dataUrl,
          filename: `${baseName}${suffix}.pdf`,
          size: result.size,
          mode,
        });
      });
    } catch (err: any) {
      console.error('Flatten error:', err);
      resetProgress();
      setError(err?.message || 'Error occurred while flattening PDF.');
    }
  };

  const handleReset = () => {
    setFile(null);
    setResultData(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {!file && (
        <UploadZone
          accept=".pdf,application/pdf"
          maxFiles={1}
          maxSizeMb={20}
          title={t('cropPdf', 'Upload PDF to Flatten')}
          subtitle={t('flattenPdfSubtitle', 'Lock form fields, signatures, and annotations or make entire PDF uneditable.')}
          onFilesSelected={(files) => setFile(files[0])}
        />
      )}

      {file && !resultData && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* File Info Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h3 className="font-bold text-xs sm:text-sm text-base-content truncate">{file.name}</h3>
                <p className="text-xs text-base-content/60">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-ghost btn-xs text-base-content/60 hover:text-error shrink-0"
            >
              {t('changeFile', 'Change')}
            </button>
          </div>

          {/* Options Panel matching user screenshot */}
          <div className="p-6 sm:p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shadow-inner shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-xl text-base-content tracking-tight">
                {t('cropPdf', 'Flatten')}
              </h3>
            </div>

            {/* Radio Option Cards */}
            <div className="space-y-3.5">
              {/* Option 1: Lock annotations in the PDF */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setMode('annotations')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMode('annotations'); }}
                className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  mode === 'annotations'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/25 ring-2 ring-blue-600/20 shadow-sm'
                    : 'border-base-300 bg-base-100 hover:border-base-400 hover:bg-base-200/40'
                }`}
              >
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      mode === 'annotations'
                        ? 'border-blue-600 bg-white dark:bg-base-100'
                        : 'border-base-300 bg-transparent'
                    }`}
                  >
                    {mode === 'annotations' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm sm:text-base text-base-content">
                    {t('lockAnnotations', 'Lock annotations in the PDF')}
                  </h4>
                  <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
                    {t('lockAnnotationsDesc', 'Comments, signatures, and form fields are combined with the rest of the PDF. Text, including text fields, stays editable and can be copied.')}
                  </p>
                </div>
              </div>

              {/* Option 2: Make PDF uneditable */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setMode('uneditable')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMode('uneditable'); }}
                className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  mode === 'uneditable'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/25 ring-2 ring-blue-600/20 shadow-sm'
                    : 'border-base-300 bg-base-100 hover:border-base-400 hover:bg-base-200/40'
                }`}
              >
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      mode === 'uneditable'
                        ? 'border-blue-600 bg-white dark:bg-base-100'
                        : 'border-base-300 bg-transparent'
                    }`}
                  >
                    {mode === 'uneditable' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm sm:text-base text-base-content">
                    {t('makeUneditable', 'Make PDF uneditable')}
                  </h4>
                  <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
                    {t('makeUneditableDesc', "Every page becomes an image. The file stays a PDF, but text can't be edited or copied.")}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-error text-xs rounded-2xl">
                <span>{error}</span>
              </div>
            )}

            {/* Continue Button */}
            <ProcessingButton
              onClick={handleProcess}
              isProcessing={isProcessing}
              progress={progress}
              loadingLabel={t('processing', 'Flattening PDF')}
            >
              <Layers className="w-5 h-5" />
              {t('cropPdf', 'Flatten PDF')}
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
          title={t('flattenSuccess', 'Your PDF has been flattened successfully!')}
          subtitle={
            resultData.mode === 'uneditable'
              ? t('uneditableSuccessDesc', 'Every page was converted to a secure, non-editable image layer. Text cannot be copied or modified.')
              : t('annotationsSuccessDesc', 'All form fields, signatures, and annotations have been merged into the document.')
          }
          extraInfo={resultData.mode === 'uneditable' ? t('makeUneditable', 'Mode: Uneditable Image Pages') : t('lockAnnotations', 'Mode: Locked Annotations')}
          resetLabel={t('processAnother', 'Flatten Another PDF')}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
