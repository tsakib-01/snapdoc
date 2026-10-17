'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRightLeft, Sparkles, AlertCircle, Palette } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ComparisonViewer from '@/components/ui/ComparisonViewer';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

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
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [quality, setQuality] = useState<number>(90);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTargetFormat(initialTarget);
    setFiles([]);
    setResult(null);
    setError(null);
  }, [initialTarget, sourceFormat]);

  useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setOriginalPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalPreviewUrl(null);
    }
  }, [files]);

  // High quality client-side canvas conversion (instant, bypasses server 413 limits, handles transparency)
  const convertImageInBrowser = async (
    file: File,
    format: 'jpeg' | 'png' | 'webp',
    qualityVal: number,
    bgColor: string
  ): Promise<any> => {
    let source: ImageBitmap | HTMLImageElement;
    if (typeof createImageBitmap !== 'undefined') {
      try {
        source = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        source = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
          };
          img.onerror = (e) => {
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
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = (e) => {
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
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // If converting to JPEG, JPEG does not support transparency, so fill background color
    if (format === 'jpeg') {
      ctx.fillStyle = bgColor || '#ffffff';
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
    setError(null);
    setIsProcessing(true);
    setResult(null);

    const file = files[0];
    try {
      // 1. Primary: Direct high-performance client-side conversion (instant, zero network upload, prevents 413)
      try {
        const clientResult = await convertImageInBrowser(file, targetFormat, quality, backgroundColor);
        setResult(clientResult);
        return;
      } catch (clientErr) {
        console.warn('Client-side conversion fallback to server:', clientErr);
      }

      // 2. Server fallback if client canvas fails
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetFormat', targetFormat);
      formData.append('quality', quality.toString());
      formData.append('backgroundColor', backgroundColor);

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

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while converting image format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
  };

  const acceptTypes =
    sourceFormat === 'jpg'
      ? 'image/jpeg,image/jpg,.jpg,.jpeg,.jfif,.pjpeg'
      : sourceFormat === 'png'
      ? 'image/png,.png'
      : sourceFormat === 'webp'
      ? 'image/webp,.webp'
      : 'image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

  return (
    <div className="w-full space-y-6">
      {files.length === 0 && (
        <UploadZone
          accept={acceptTypes}
          files={files}
          onFilesSelected={setFiles}
          title={`Upload ${sourceFormat.toUpperCase()} image to convert`}
          subtitle={`Convert seamlessly to ${targetFormat.toUpperCase()}`}
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300">
            <div className="flex items-center gap-3">
              {originalPreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={originalPreviewUrl} alt="Thumb" className="w-12 h-12 object-cover rounded-xl border border-base-300" />
              )}
              <div>
                <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs">{files[0].name}</p>
                <p className="text-xs text-base-content/60">Original: <strong>{formatBytes(files[0].size)}</strong></p>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-xs text-base-content/60 hover:text-error">
              Change
            </button>
          </div>

          {/* Options Card */}
          <div className="p-5 rounded-2xl bg-base-200/40 border border-base-300 space-y-4">
            {!fixedTarget && (
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
                      className={`btn btn-sm uppercase rounded-xl ${
                        targetFormat === fmt ? 'btn-primary text-white font-bold' : 'btn-ghost bg-base-100 border border-base-300'
                      }`}
                    >
                      {fmt === 'jpeg' ? 'JPG / JPEG' : fmt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Transparency Background Color picker (important for PNG -> JPG) */}
            {targetFormat === 'jpeg' && (
              <div className="p-4 rounded-2xl bg-base-100 border border-base-300 space-y-2 animate-in fade-in duration-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-base-content/80 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Background Color for Transparent Areas:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-base-300"
                    />
                    <span className="text-xs font-mono font-semibold uppercase">{backgroundColor}</span>
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setBackgroundColor('#ffffff')}
                    className="btn btn-xs btn-ghost border border-base-300 rounded-lg"
                  >
                    White (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackgroundColor('#000000')}
                    className="btn btn-xs btn-ghost border border-base-300 rounded-lg"
                  >
                    Black
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-error text-xs rounded-2xl py-3 shadow-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing}
            className="btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/20 gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Converting Format...
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-5 h-5" />
                Convert to {targetFormat.toUpperCase()}
              </>
            )}
          </button>
        </div>
      )}

      {result && originalPreviewUrl && (
        <div className="space-y-6">
          <ComparisonViewer
            originalUrl={originalPreviewUrl}
            processedUrl={result.dataUrl}
            originalSize={result.originalSize}
            processedSize={result.compressedSize}
            originalDimensions={{ width: result.width, height: result.height }}
            processedDimensions={{ width: result.width, height: result.height }}
          />

          <ResultCard
            originalSize={result.originalSize}
            newSize={result.compressedSize}
            reductionPercentage={result.reductionPercentage}
            filename={`${result.originalName.replace(/\.[^/.]+$/, '')}.${result.format === 'jpeg' ? 'jpg' : result.format}`}
            dataUrl={result.dataUrl}
            format={result.format.toUpperCase()}
            dimensions={{ width: result.width, height: result.height }}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
