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

function parseHexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace(/^#/, '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }
  return { r: 255, g: 255, b: 255 };
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
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [detectedBgType, setDetectedBgType] = useState<'transparent' | 'checkerboard' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTargetFormat(initialTarget);
    setFiles([]);
    setResult(null);
    setLivePreviewUrl(null);
    setDetectedBgType(null);
    setError(null);
  }, [initialTarget, sourceFormat]);

  useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setOriginalPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalPreviewUrl(null);
      setLivePreviewUrl(null);
      setDetectedBgType(null);
    }
  }, [files]);

  // Generate live visual preview with background color applied
  useEffect(() => {
    if (!files || files.length === 0 || !originalPreviewUrl) {
      setLivePreviewUrl(null);
      setDetectedBgType(null);
      return;
    }

    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isCancelled) return;
      try {
        const maxDim = 320;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const w = Math.max(1, Math.round((img.naturalWidth || 100) * scale));
        const h = Math.max(1, Math.round((img.naturalHeight || 100) * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const target = parseHexToRgb(backgroundColor);

        let hasAlpha = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 240) {
            hasAlpha = true;
            break;
          }
        }

        const isChecker = (idx: number) => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          return r > 210 && g > 210 && b > 210 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18;
        };

        let borderCheckerCount = 0;
        const borderSamples = w * 2 + h * 2;
        for (let x = 0; x < w; x++) {
          if (isChecker(x * 4)) borderCheckerCount++;
          if (isChecker(((h - 1) * w + x) * 4)) borderCheckerCount++;
        }
        for (let y = 0; y < h; y++) {
          if (isChecker((y * w) * 4)) borderCheckerCount++;
          if (isChecker((y * w + w - 1) * 4)) borderCheckerCount++;
        }

        const isFakeCheckerboard = borderCheckerCount / borderSamples > 0.35;
        setDetectedBgType(hasAlpha ? 'transparent' : isFakeCheckerboard ? 'checkerboard' : null);

        if (hasAlpha) {
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3] / 255;
            if (a < 1) {
              data[i] = Math.round(data[i] * a + target.r * (1 - a));
              data[i + 1] = Math.round(data[i + 1] * a + target.g * (1 - a));
              data[i + 2] = Math.round(data[i + 2] * a + target.b * (1 - a));
              data[i + 3] = 255;
            }
          }
        }

        if (isFakeCheckerboard) {
          const visited = new Uint8Array(w * h);
          const queue: number[] = [];

          for (let x = 0; x < w; x++) {
            if (isChecker(x * 4)) { visited[x] = 1; queue.push(x); }
            const botIdx = (h - 1) * w + x;
            if (isChecker(botIdx * 4)) { visited[botIdx] = 1; queue.push(botIdx); }
          }
          for (let y = 0; y < h; y++) {
            const leftIdx = y * w;
            if (!visited[leftIdx] && isChecker(leftIdx * 4)) { visited[leftIdx] = 1; queue.push(leftIdx); }
            const rightIdx = y * w + (w - 1);
            if (!visited[rightIdx] && isChecker(rightIdx * 4)) { visited[rightIdx] = 1; queue.push(rightIdx); }
          }

          let head = 0;
          while (head < queue.length) {
            const curr = queue[head++];
            const cx = curr % w;
            const cy = Math.floor(curr / w);

            const neighbors = [
              cx > 0 ? curr - 1 : -1,
              cx < w - 1 ? curr + 1 : -1,
              cy > 0 ? curr - w : -1,
              cy < h - 1 ? curr + w : -1,
            ];

            for (const nb of neighbors) {
              if (nb >= 0 && !visited[nb] && isChecker(nb * 4)) {
                visited[nb] = 1;
                queue.push(nb);
              }
            }
          }

          for (let i = 0; i < w * h; i++) {
            if (visited[i]) {
              data[i * 4] = target.r;
              data[i * 4 + 1] = target.g;
              data[i * 4 + 2] = target.b;
              data[i * 4 + 3] = 255;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        setLivePreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        setLivePreviewUrl(null);
      }
    };

    img.src = originalPreviewUrl;
    return () => {
      isCancelled = true;
    };
  }, [files, originalPreviewUrl, backgroundColor]);

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
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(source, 0, 0, width, height);

    if ('close' in source && typeof source.close === 'function') {
      source.close();
    }

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const target = parseHexToRgb(bgColor || '#ffffff');

    // 1. Check for real alpha transparency
    let hasAlpha = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 240) {
        hasAlpha = true;
        break;
      }
    }

    // 2. Check for checkerboard pattern from borders
    const isChecker = (idx: number) => {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      return r > 210 && g > 210 && b > 210 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18;
    };

    let borderCheckerCount = 0;
    const borderSamples = width * 2 + height * 2;
    for (let x = 0; x < width; x++) {
      if (isChecker(x * 4)) borderCheckerCount++;
      if (isChecker(((height - 1) * width + x) * 4)) borderCheckerCount++;
    }
    for (let y = 0; y < height; y++) {
      if (isChecker((y * width) * 4)) borderCheckerCount++;
      if (isChecker((y * width + width - 1) * 4)) borderCheckerCount++;
    }

    const isFakeCheckerboard = borderCheckerCount / borderSamples > 0.35;

    // Apply real alpha blending
    if (hasAlpha) {
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3] / 255;
        if (a < 1) {
          data[i] = Math.round(data[i] * a + target.r * (1 - a));
          data[i + 1] = Math.round(data[i + 1] * a + target.g * (1 - a));
          data[i + 2] = Math.round(data[i + 2] * a + target.b * (1 - a));
          data[i + 3] = 255;
        }
      }
    }

    // Apply BFS flood-fill replacement for border-connected checkerboard pattern
    if (isFakeCheckerboard) {
      const visited = new Uint8Array(width * height);
      const queue: number[] = [];

      for (let x = 0; x < width; x++) {
        if (isChecker(x * 4)) { visited[x] = 1; queue.push(x); }
        const botIdx = (height - 1) * width + x;
        if (isChecker(botIdx * 4)) { visited[botIdx] = 1; queue.push(botIdx); }
      }
      for (let y = 0; y < height; y++) {
        const leftIdx = y * width;
        if (!visited[leftIdx] && isChecker(leftIdx * 4)) { visited[leftIdx] = 1; queue.push(leftIdx); }
        const rightIdx = y * width + (width - 1);
        if (!visited[rightIdx] && isChecker(rightIdx * 4)) { visited[rightIdx] = 1; queue.push(rightIdx); }
      }

      let head = 0;
      while (head < queue.length) {
        const curr = queue[head++];
        const cx = curr % width;
        const cy = Math.floor(curr / width);

        const neighbors = [
          cx > 0 ? curr - 1 : -1,
          cx < width - 1 ? curr + 1 : -1,
          cy > 0 ? curr - width : -1,
          cy < height - 1 ? curr + width : -1,
        ];

        for (const nb of neighbors) {
          if (nb >= 0 && !visited[nb] && isChecker(nb * 4)) {
            visited[nb] = 1;
            queue.push(nb);
          }
        }
      }

      for (let i = 0; i < width * height; i++) {
        if (visited[i]) {
          data[i * 4] = target.r;
          data[i * 4 + 1] = target.g;
          data[i * 4 + 2] = target.b;
          data[i * 4 + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

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

            {/* Transparency Background Color picker with Live Visual Preview */}
            {(targetFormat === 'jpeg' || sourceFormat === 'png' || sourceFormat === 'webp' || fixedTarget) && (
              <div className="p-4 rounded-2xl bg-base-100 border border-base-300 space-y-3 animate-in fade-in duration-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-semibold text-base-content/80 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Background Color for Transparent / Pattern Areas:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-base-300 shadow-xs"
                    />
                    <span className="text-xs font-mono font-semibold uppercase">{backgroundColor}</span>
                  </div>
                </div>

                {/* Preset color chips */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setBackgroundColor('#ffffff')}
                    className={`btn btn-xs rounded-lg ${backgroundColor === '#ffffff' ? 'btn-neutral font-bold' : 'btn-ghost border border-base-300'}`}
                  >
                    White (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackgroundColor('#000000')}
                    className={`btn btn-xs rounded-lg ${backgroundColor === '#000000' ? 'btn-neutral font-bold' : 'btn-ghost border border-base-300'}`}
                  >
                    Black
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackgroundColor('#64748b')}
                    className={`btn btn-xs rounded-lg ${backgroundColor === '#64748b' ? 'btn-neutral font-bold' : 'btn-ghost border border-base-300'}`}
                  >
                    Slate Gray
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackgroundColor('#38bdf8')}
                    className={`btn btn-xs rounded-lg ${backgroundColor === '#38bdf8' ? 'btn-neutral font-bold' : 'btn-ghost border border-base-300'}`}
                  >
                    Sky Blue
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackgroundColor('#fef3c7')}
                    className={`btn btn-xs rounded-lg ${backgroundColor === '#fef3c7' ? 'btn-neutral font-bold' : 'btn-ghost border border-base-300'}`}
                  >
                    Warm Cream
                  </button>
                </div>

                {/* Live Preview Box with Detection Badge */}
                {livePreviewUrl && (
                  <div className="pt-2 border-t border-base-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-base-content/70">Live Background Preview:</span>
                      {detectedBgType === 'checkerboard' ? (
                        <span className="badge badge-xs bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold gap-1">
                          ✨ Fake Checkerboard Detected & Replaced
                        </span>
                      ) : detectedBgType === 'transparent' ? (
                        <span className="badge badge-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold gap-1">
                          ✓ Transparent Background Filled
                        </span>
                      ) : null}
                    </div>
                    <div className="w-full max-h-[220px] p-2 flex items-center justify-center rounded-xl border border-base-300 bg-base-200/40 shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={livePreviewUrl}
                        alt="Background live preview"
                        className="max-h-[190px] max-w-full object-contain rounded-lg shadow-xs"
                      />
                    </div>
                  </div>
                )}
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
