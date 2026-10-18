'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, AlertCircle, CheckCircle2, Image as ImageIcon, Eye } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ComparisonViewer from '@/components/ui/ComparisonViewer';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';
import { scrollToTool } from '@/lib/utils/scrollHelper';
import { getSafeImagePreview } from '@/lib/utils/previewHelper';
import { useProgressAction } from '@/lib/hooks/useProgressAction';
import ProcessingButton from '@/components/ui/ProcessingButton';
import { safeFetchJson } from '@/lib/utils/apiHelper';

// Optimal high-efficiency compression quality giving maximum file reduction with clear visuals
const MAX_COMPRESSION_QUALITY = 65;

export default function GeneralCompressorTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [targetFormat, setTargetFormat] = useState<'original' | 'jpeg' | 'png' | 'webp'>('original');
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
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('quality', MAX_COMPRESSION_QUALITY.toString());
      formData.append('format', targetFormat);

      const res = await fetch('/api/compress-general', {
        method: 'POST',
        body: formData,
      });

      const data = await safeFetchJson(res);

      await finishProgress(() => {
        setResult(data);
      });
    } catch (err: any) {
      resetProgress();
      setError(err.message || 'Error occurred while compressing image.');
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
      {files.length === 0 && (
        <UploadZone
          accept="image/*, .jpg, .jpeg, .jfif, .pjpeg, .pjp, .png, .webp, .avif, .bmp, .heic, .heif"
          files={files}
          onFilesSelected={setFiles}
          title="Drop image to optimize"
          subtitle="Supports JPG, PNG, WebP, and camera formats"
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
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
            <button onClick={handleReset} className="btn btn-ghost btn-xs text-base-content/60 hover:text-error">
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

          {/* Maximum Output Compression Mode */}
          <div className="p-5 rounded-2xl bg-base-200/30 border border-base-300 space-y-4">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-base-content">Maximum Compression</h4>
                  <p className="text-xs text-base-content/60">
                    Automatically applies the highest possible file size reduction while maintaining clean visual clarity.
                  </p>
                </div>
              </div>
              <span className="badge badge-success text-success-content font-bold text-xs px-2.5 py-1 shrink-0 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auto-Optimized</span>
              </span>
            </div>

            {/* Output Format Picker */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-base-200/60">
              <span className="text-xs font-semibold text-base-content/70">
                Output Format:
              </span>
              <div className="join">
                {(['original', 'jpeg', 'png', 'webp'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setTargetFormat(fmt)}
                    className={`btn btn-xs join-item uppercase ${
                      targetFormat === fmt ? 'btn-primary text-primary-content font-bold' : 'btn-ghost'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
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
            loadingLabel="Compressing"
          >
            <Sparkles className="w-5 h-5" />
            <span>Compress Image</span>
          </ProcessingButton>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {originalPreviewUrl && (
            <ComparisonViewer
              originalUrl={originalPreviewUrl}
              processedUrl={result.dataUrl}
              originalSize={result.originalSize}
              processedSize={result.compressedSize}
              originalDimensions={{ width: result.width, height: result.height }}
              processedDimensions={{ width: result.width, height: result.height }}
            />
          )}

          <ResultCard
            originalSize={result.originalSize}
            newSize={result.compressedSize}
            reductionPercentage={result.reductionPercentage}
            filename={`compressed_${result.originalName}`}
            dataUrl={result.dataUrl}
            format={result.format}
            dimensions={{ width: result.width, height: result.height }}
            onReset={handleReset}
            hideHeader={true}
          />
        </div>
      )}
    </div>
  );
}
