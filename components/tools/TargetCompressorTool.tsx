'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRight, Sparkles, Check, AlertCircle, Image as ImageIcon, Eye } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ComparisonViewer from '@/components/ui/ComparisonViewer';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';
import { scrollToTool } from '@/lib/utils/scrollHelper';
import { getSafeImagePreview } from '@/lib/utils/previewHelper';
import { useProgressAction } from '@/lib/hooks/useProgressAction';
import ProcessingButton from '@/components/ui/ProcessingButton';
import { safeFetchJson } from '@/lib/utils/apiHelper';

interface TargetCompressorToolProps {
  defaultTargetKb?: number;
  fixedTarget?: boolean;
}

const PRESET_SIZES = [
  { label: '10 KB', value: 10, note: 'Govt exams / signatures' },
  { label: '20 KB', value: 20, note: 'ID portals / SSC' },
  { label: '50 KB', value: 50, note: 'Visa & Passport photos' },
  { label: '100 KB', value: 100, note: 'Web & Email attachments' },
  { label: '200 KB', value: 200, note: 'Document uploads' },
  { label: '500 KB', value: 500, note: 'High resolution web' },
  { label: '1 MB', value: 1024, note: '1024 KB standard' },
];

export default function TargetCompressorTool({
  defaultTargetKb = 50,
  fixedTarget = false,
}: TargetCompressorToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [targetKb, setTargetKb] = useState<number>(defaultTargetKb);
  const [customKb, setCustomKb] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const { isProcessing, progress, startProgress, finishProgress, resetProgress } = useProgressAction();
  const [result, setResult] = useState<any | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [origDimensions, setOrigDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    if (files.length > 0) {
      // 1. Immediately provide instant baseline preview so thumbnail and preview appear in 0ms!
      let instantUrl = '';
      try {
        instantUrl = URL.createObjectURL(files[0]);
        setOriginalPreviewUrl(instantUrl);
      } catch {}

      setIsPreviewLoading(true);

      getSafeImagePreview(files[0])
        .then((preview) => {
          if (!isCancelled) {
            setOriginalPreviewUrl(preview.previewUrl);
            setOrigDimensions({ width: preview.width, height: preview.height });
            setIsPreviewLoading(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error('Preview error:', err);
            if (instantUrl) {
              setOriginalPreviewUrl(instantUrl);
              const img = new Image();
              img.onload = () => {
                if (!isCancelled && img.naturalWidth) {
                  setOrigDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                }
              };
              img.src = instantUrl;
            }
            setIsPreviewLoading(false);
          }
        });
    } else {
      setOriginalPreviewUrl(null);
      setOrigDimensions(null);
      setIsPreviewLoading(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [files]);

  const handleProcess = async () => {
    if (files.length === 0) return;
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setError(null);
    startProgress();
    setResult(null);

    try {
      const activeKb = isCustom ? (parseFloat(customKb) || 50) : targetKb;
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('targetKb', activeKb.toString());
      formData.append('format', 'original');

      const res = await fetch('/api/compress-target', {
        method: 'POST',
        body: formData,
      });

      const data = await safeFetchJson(res);

      await finishProgress(() => {
        setResult(data);
      });
    } catch (err: any) {
      resetProgress();
      setError(err.message || 'Something went wrong during compression.');
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    scrollToTool();
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Upload state */}
      {files.length === 0 && (
        <UploadZone
          accept="image/*, .jpg, .jpeg, .jfif, .pjpeg, .pjp, .png, .webp, .avif, .bmp, .heic, .heif"
          files={files}
          onFilesSelected={setFiles}
          title="Drop your image to compress"
          subtitle="Supports JPG, PNG, WebP, and camera formats (Up to 50MB)"
        />
      )}

      {/* 2. File uploaded & Configuration Panel */}
      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* File summary bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300 gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-base-200 border border-base-300 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative">
                {originalPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={originalPreviewUrl}
                    alt="Original thumb"
                    className="w-full h-full object-cover"
                    onError={() => {
                      try {
                        setOriginalPreviewUrl(URL.createObjectURL(files[0]));
                      } catch {}
                    }}
                  />
                ) : isPreviewLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-base-content/40" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs sm:max-w-md">
                  {files[0].name}
                </p>
                <div className="flex items-center gap-2 pt-0.5 text-xs text-base-content/60 flex-wrap">
                  <span>Original: <strong className="text-base-content font-mono">{formatBytes(files[0].size)}</strong></span>
                  {origDimensions && (
                    <span className="badge badge-sm badge-ghost text-[10px] font-mono">
                      {origDimensions.width} × {origDimensions.height} px
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="btn btn-ghost btn-xs text-base-content/60 hover:text-error"
            >
              Change File
            </button>
          </div>

          {/* Visual Image Preview Card */}
          {originalPreviewUrl ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-3 sm:p-5 shadow-xs flex flex-col items-center justify-center space-y-3">
              <div className="flex items-center justify-between w-full px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  Uploaded Image Preview
                </span>
                {origDimensions && (
                  <span className="badge badge-sm badge-ghost font-mono text-[11px]">
                    {origDimensions.width} × {origDimensions.height} px
                  </span>
                )}
              </div>

              <div className="relative w-full max-h-[320px] sm:max-h-[380px] rounded-xl overflow-hidden bg-base-200/40 flex items-center justify-center border border-base-200 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalPreviewUrl}
                  alt={files[0].name}
                  className="max-h-[300px] sm:max-h-[360px] w-auto max-w-full object-contain rounded-lg shadow-sm"
                  onError={() => {
                    try {
                      setOriginalPreviewUrl(URL.createObjectURL(files[0]));
                    } catch {}
                  }}
                />
              </div>
            </div>
          ) : isPreviewLoading ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-8 flex flex-col items-center justify-center gap-2 text-xs text-base-content/60">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Preparing uploaded image preview...</span>
            </div>
          ) : null}

          {/* Target Size Selectors */}
          {!fixedTarget && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Select Desired Target File Size
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_SIZES.map((preset) => {
                  const isSelected = !isCustom && targetKb === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setTargetKb(preset.value);
                        setIsCustom(false);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-base-300 bg-base-100 hover:border-primary/40 hover:bg-base-200/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-base-content">
                          {preset.label}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <span className="text-[10px] text-base-content/50 block mt-0.5 line-clamp-1">
                        {preset.note}
                      </span>
                    </button>
                  );
                })}

                {/* Custom Target size tile */}
                <button
                  type="button"
                  onClick={() => setIsCustom(true)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isCustom
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                      : 'border-base-300 bg-base-100 hover:border-primary/40 hover:bg-base-200/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-base-content">Custom Size</span>
                    {isCustom && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <span className="text-[10px] text-base-content/50 block mt-0.5">
                    Enter custom KB
                  </span>
                </button>
              </div>

              {/* Custom input box */}
              {isCustom && (
                <div className="p-4 rounded-2xl bg-base-200/40 border border-base-300 flex items-center gap-3 animate-in fade-in duration-100">
                  <span className="text-xs font-semibold text-base-content/70">
                    Target KB:
                  </span>
                  <input
                    type="number"
                    min="5"
                    max="50000"
                    value={customKb}
                    onChange={(e) => setCustomKb(e.target.value)}
                    placeholder="e.g. 75"
                    className="input input-sm input-bordered rounded-xl w-32 font-bold"
                  />
                  <span className="text-xs text-base-content/50">
                    KB (e.g. 30 KB, 75 KB, 350 KB)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          {error && (
            <div className="alert alert-error text-xs rounded-2xl py-3 shadow-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <ProcessingButton
              onClick={handleProcess}
              isProcessing={isProcessing}
              progress={progress}
              loadingLabel="Compressing"
            >
              <Sparkles className="w-5 h-5" />
              Compress to {isCustom ? `${customKb || '50'} KB` : `${targetKb} KB`}
            </ProcessingButton>
          </div>
        </div>
      )}

      {/* 3. Result View */}
      {result && (
        <div className="space-y-6">
          {originalPreviewUrl && (
            <ComparisonViewer
              originalUrl={originalPreviewUrl}
              processedUrl={result.dataUrl}
              originalSize={result.originalSize}
              processedSize={result.compressedSize}
              originalDimensions={{ width: result.originalWidth, height: result.originalHeight }}
              processedDimensions={{ width: result.width, height: result.height }}
            />
          )}

          <ResultCard
            originalSize={result.originalSize}
            newSize={result.compressedSize}
            reductionPercentage={result.reductionPercentage}
            filename={`compressed_${result.originalName.replace(/\.[^/.]+$/, '')}.jpg`}
            dataUrl={result.dataUrl}
            format="JPG"
            dimensions={{ width: result.width, height: result.height }}
            onReset={handleReset}
            hideHeader={true}
          />
        </div>
      )}
    </div>
  );
}
