'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRightLeft, AlertCircle, Image as ImageIcon, Eye } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ComparisonViewer from '@/components/ui/ComparisonViewer';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';
import { scrollToTool } from '@/lib/utils/scrollHelper';
import { getSafeImagePreview } from '@/lib/utils/previewHelper';
import { useProgressAction } from '@/lib/hooks/useProgressAction';
import ProcessingButton from '@/components/ui/ProcessingButton';

interface ConverterToolProps {
  sourceFormat?: 'jpg' | 'png' | 'webp' | 'any';
  targetFormat?: 'jpeg' | 'png' | 'webp';
  fixedTarget?: boolean;
}

export default function ConverterTool({
  sourceFormat = 'any',
  targetFormat: initialTarget = 'png',
  fixedTarget = false,
}: ConverterToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [targetFormat, setTargetFormat] = useState<'jpeg' | 'png' | 'webp'>(initialTarget);
  const [quality, setQuality] = useState<number>(90);
  const { isProcessing, progress, startProgress, finishProgress, resetProgress } = useProgressAction();
  const [result, setResult] = useState<any | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [origDimensions, setOrigDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTargetFormat(initialTarget);
    setFiles([]);
    setResult(null);
    setError(null);
    setOriginalPreviewUrl(null);
    setOrigDimensions(null);
  }, [initialTarget, sourceFormat]);

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
            console.error('Converter preview error:', err);
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

  // High-performance client-side canvas conversion (instant, bypasses server size limits, preserves true image quality)
  const convertImageInBrowser = async (
    file: File,
    format: 'jpeg' | 'png' | 'webp',
    qualityVal: number
  ): Promise<any> => {
    let source: ImageBitmap | HTMLImageElement;
    if (typeof createImageBitmap !== 'undefined') {
      try {
        source = await Promise.race([
          createImageBitmap(file, { imageOrientation: 'from-image' }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('createImageBitmap timeout')), 2500))
        ]);
      } catch {
        source = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          const timer = setTimeout(() => {
            URL.revokeObjectURL(url);
            reject(new Error('Image decode timeout'));
          }, 2500);
          img.onload = () => {
            clearTimeout(timer);
            URL.revokeObjectURL(url);
            resolve(img);
          };
          img.onerror = (e) => {
            clearTimeout(timer);
            URL.revokeObjectURL(url);
            reject(e);
          };
          img.src = url;
        });
      }
    } else {
      source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        const timer = setTimeout(() => {
          URL.revokeObjectURL(url);
          reject(new Error('Image decode timeout'));
        }, 2500);
        img.onload = () => {
          clearTimeout(timer);
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = (e) => {
          clearTimeout(timer);
          URL.revokeObjectURL(url);
          reject(e);
        };
        img.src = url;
      });
    }

    const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
    const height = 'naturalHeight' in source ? source.naturalHeight : source.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // For JPEG: fill clean default white background since JPEG format does not support transparency
    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(source, 0, 0, width, height);

    if ('close' in source && typeof source.close === 'function') {
      source.close();
    }

    const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    const q = Math.min(1, Math.max(0.01, qualityVal / 100));
    const dataUrl = canvas.toDataURL(mimeType, q);

    // If browser doesn't support WebP in canvas, it falls back to PNG dataUrl; trigger server fallback
    if (format === 'webp' && !dataUrl.startsWith('data:image/webp')) {
      throw new Error('WebP canvas export not supported by browser, falling back to server');
    }

    const base64Data = dataUrl.split(',')[1] || '';
    const compressedSize = Math.round((base64Data.length * 3) / 4);
    const originalSize = file.size;
    const reductionPercentage =
      originalSize > 0
        ? parseFloat((((originalSize - compressedSize) / originalSize) * 100).toFixed(1))
        : 0;

    return {
      success: true,
      originalName: file.name,
      originalSize,
      compressedSize,
      reductionPercentage,
      width,
      height,
      format,
      mimeType,
      dataUrl,
    };
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setError(null);
    startProgress();
    setResult(null);

    const file = files[0];
    try {
      // 1. Primary: Direct high-performance client-side conversion (instant, zero network upload, prevents 413)
      try {
        const clientResult = await convertImageInBrowser(file, targetFormat, quality);
        await finishProgress(() => {
          setResult(clientResult);
        });
        return;
      } catch (clientErr) {
        console.warn('Client-side conversion fallback to server:', clientErr);
      }

      // 2. Server fallback if client canvas fails
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetFormat', targetFormat);
      formData.append('quality', quality.toString());

      const res = await fetch('/api/convert-image', {
        method: 'POST',
        body: formData,
      });

      if (res.status === 413) {
        throw new Error('The image file is too large for server processing. Please try a smaller image.');
      }

      const contentType = res.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        throw new Error(rawText || `Server error (${res.status})`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Conversion failed');
      }

      await finishProgress(() => {
        setResult(data);
      });
    } catch (err: any) {
      resetProgress();
      setError(err.message || 'Error occurred while converting image format.');
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    scrollToTool();
  };

  const displaySource = sourceFormat === 'any' ? 'image' : sourceFormat.toUpperCase();
  const displayTarget = targetFormat === 'jpeg' ? 'JPG' : targetFormat.toUpperCase();

  const acceptTypes =
    sourceFormat === 'jpg'
      ? 'image/jpeg,image/jpg,image/*,.jpg,.jpeg,.jfif,.pjpeg,.png,.webp'
      : sourceFormat === 'png'
      ? 'image/png,image/*,.png,.PNG,.jpg,.jpeg,.jfif,.pjpeg,.webp'
      : sourceFormat === 'webp'
      ? 'image/webp,image/*,.webp,.WEBP,.jpg,.jpeg,.jfif,.pjpeg,.png'
      : 'image/*,.jpg,.jpeg,.png,.webp,.heic,.heif';

  return (
    <div className="w-full space-y-6">
      {files.length === 0 && (
        <UploadZone
          accept={acceptTypes}
          files={files}
          onFilesSelected={setFiles}
          title={`Upload ${displaySource} image to convert`}
          subtitle={`Convert seamlessly to ${displayTarget}`}
        />
      )}

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

          {/* Options Card - Only shown when user can pick target format */}
          {!fixedTarget && (
            <div className="p-5 rounded-2xl bg-base-200/40 border border-base-300 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 block">
                  Select Output Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setTargetFormat(fmt)}
                      className={`btn btn-sm uppercase rounded-xl h-auto min-h-[2.5rem] py-1.5 px-2 text-xs font-semibold leading-tight text-center flex items-center justify-center ${
                        targetFormat === fmt ? 'btn-primary text-white font-bold' : 'btn-ghost bg-base-100 border border-base-300'
                      }`}
                    >
                      {fmt === 'jpeg' ? 'JPG / JPEG' : fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
            loadingLabel={`Converting to ${displayTarget}`}
          >
            <ArrowRightLeft className="w-5 h-5" />
            Convert to {displayTarget}
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
            filename={`${result.originalName.replace(/\.[^/.]+$/, '')}.${result.format === 'jpeg' ? 'jpg' : result.format}`}
            dataUrl={result.dataUrl}
            format={result.format === 'jpeg' ? 'JPG' : result.format.toUpperCase()}
            dimensions={{ width: result.width, height: result.height }}
            onReset={handleReset}
            hideHeader={true}
          />
        </div>
      )}
    </div>
  );
}
