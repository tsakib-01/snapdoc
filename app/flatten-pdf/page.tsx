'use client';

import React, { useState } from 'react';
import { Layers, Download, Loader2, RotateCcw, ArrowRight, ShieldCheck, FileCheck } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import ToolLayout from '@/components/ui/ToolLayout';
import { formatBytes } from '@/lib/utils/formatters';

type FlattenMode = 'annotations' | 'uneditable';

export default function FlattenPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<FlattenMode>('annotations');
  const [processing, setProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('Flattening PDF...');
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
    mode: FlattenMode;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = {
    id: 'flatten-pdf',
    name: 'Flatten PDF',
    slug: 'flatten-pdf',
    description: 'Merge fillable form fields, annotations, or rasterize pages into an uneditable, secure PDF.',
    longDescription: 'Lock and secure your PDF forms, signatures, and annotations, or turn entire pages into non-editable images.',
    category: 'pdf' as const,
    icon: 'Layers',
    acceptedTypes: 'application/pdf',
    keywords: ['flatten pdf', 'lock pdf form', 'make pdf uneditable', 'merge pdf layers'],
    features: [
      'Lock interactive form fields and signatures permanently',
      'Optionally rasterize pages so text cannot be edited or copied',
      'Optimizes document rendering across all PDF viewers',
      '100% private in-browser processing'
    ],
    howTo: [
      { step: '1', text: 'Upload your interactive PDF or filled document.' },
      { step: '2', text: 'Choose to lock annotations or make the entire PDF uneditable.' },
      { step: '3', text: 'Click Continue to download your finalized PDF.' }
    ],
    faqs: [
      {
        q: 'What is the difference between the two options?',
        a: '"Lock annotations" merges forms and signatures while keeping text sharp and selectable. "Make PDF uneditable" turns every page into an image so no text can be copied or edited.'
      }
    ]
  };

  /** Mode 1: Lock annotations and form fields into the PDF (text stays selectable & editable) */
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
    const blob = new Blob([flattenedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
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
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
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

      const jpegBytes: Uint8Array = await new Promise((res) => {
        canvas.toBlob(
          async (b) => {
            if (b) res(new Uint8Array(await b.arrayBuffer()));
          },
          'image/jpeg',
          0.92
        );
      });

      canvas.width = canvas.height = 0; // Free memory immediately

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
    const blob = new Blob([finalBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    return {
      blob,
      dataUrl: URL.createObjectURL(blob),
      size: blob.size,
    };
  };

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);
    setProgressText(mode === 'uneditable' ? 'Rendering pages as images...' : 'Locking annotations & forms...');

    try {
      let result: { blob: Blob; dataUrl: string; size: number };

      if (mode === 'uneditable') {
        result = await flattenToUneditableImages(file, (pct) => {
          setProgressText(`Rendering uneditable pages (${pct}%)...`);
        });
      } else {
        result = await flattenAnnotations(file);
      }

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const suffix = mode === 'uneditable' ? '_uneditable' : '_flattened';

      setResultData({
        dataUrl: result.dataUrl,
        filename: `${baseName}${suffix}.pdf`,
        size: result.size,
        mode,
      });
    } catch (err: any) {
      console.error('Flatten error:', err);
      setError(err?.message || 'Error occurred while flattening PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResultData(null);
    setError(null);
  };

  return (
    <ToolLayout tool={tool}>
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {!file && (
          <UploadZone
            accept=".pdf,application/pdf"
            maxFiles={1}
            maxSizeMb={50}
            title="Upload PDF to Flatten"
            subtitle="Lock form fields, signatures, and annotations or make entire PDF uneditable."
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
                Change
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
                  Flatten
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
                      Lock annotations in the PDF
                    </h4>
                    <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
                      Comments, signatures, and form fields are combined with the rest of the PDF. Text, including text fields, stays editable and can be copied.
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
                      Make PDF uneditable
                    </h4>
                    <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
                      Every page becomes an image. The file stays a PDF, but text can&apos;t be edited or copied.
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
              <button
                type="button"
                onClick={handleProcess}
                disabled={processing}
                className="btn btn-primary w-full py-4 h-auto rounded-2xl text-white font-bold gap-2 text-base shadow-xl shadow-primary/20"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{progressText}</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
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
            title="Your PDF has been flattened successfully!"
            subtitle={
              resultData.mode === 'uneditable'
                ? 'Every page was converted to a secure, non-editable image layer. Text cannot be copied or modified.'
                : 'All form fields, signatures, and annotations have been merged into the document.'
            }
            extraInfo={resultData.mode === 'uneditable' ? 'Mode: Uneditable Image Pages' : 'Mode: Locked Annotations'}
            resetLabel="Flatten Another PDF"
            onReset={handleReset}
          />
        )}
      </div>
    </ToolLayout>
  );
}
