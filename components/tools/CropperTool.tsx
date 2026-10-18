'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Loader2,
  Crop,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Image as ImageIcon,
  AlertCircle,
  Minus,
  Plus,
  Maximize2,
  Move,
  Eye,
  Mouse,
  Pointer,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';
import { scrollToTool } from '@/lib/utils/scrollHelper';
import { getSafeImagePreview } from '@/lib/utils/previewHelper';
import { useProgressAction } from '@/lib/hooks/useProgressAction';
import ProcessingButton from '@/components/ui/ProcessingButton';
import { safeFetchJson } from '@/lib/utils/apiHelper';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type DragHandle =
  | 'draw'
  | 'move'
  | 'nw'
  | 'ne'
  | 'se'
  | 'sw'
  | 'n'
  | 's'
  | 'e'
  | 'w';

interface CropMargins {
  top: number;     // 0 - 45%
  bottom: number;  // 0 - 45%
  left: number;    // 0 - 45%
  right: number;   // 0 - 45%
}

export default function CropperTool() {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [origDimensions, setOrigDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  // Active margins (percentages 0% to 45%) - default 0% (whole image ready for custom crop)
  const [topMargin, setTopMargin] = useState<number>(0);
  const [bottomMargin, setBottomMargin] = useState<number>(0);
  const [leftMargin, setLeftMargin] = useState<number>(0);
  const [rightMargin, setRightMargin] = useState<number>(0);

  // Active preset tracking
  const [activePreset, setActivePreset] = useState<string>('none');

  // Processing state
  const { isProcessing, progress, startProgress, finishProgress, resetProgress } = useProgressAction();
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Drag interaction refs
  const previewRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    initLeft: number;
    initRight: number;
    initTop: number;
    initBottom: number;
  } | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    if (files.length > 0) {
      setIsPreviewLoading(true);
      setError(null);
      setResult(null);
      setTopMargin(0);
      setBottomMargin(0);
      setLeftMargin(0);
      setRightMargin(0);
      setActivePreset('none');

      // 1. Immediately provide instant baseline preview so thumbnail and crop view appear in 0ms!
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
            console.error('Cropper preview error:', err);
            if (instantUrl) {
              setOriginalPreviewUrl(instantUrl);
              const img = new Image();
              img.onload = () => {
                if (!isCancelled) {
                  setOrigDimensions({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
                }
              };
              img.src = instantUrl;
            }
            setIsPreviewLoading(false);
          }
        });
    } else {
      setOriginalPreviewUrl(null);
      setOrigDimensions({ width: 0, height: 0 });
      setIsPreviewLoading(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [files]);

  // Apply Ratio and Margin Presets
  const handleApplyPreset = (preset: string) => {
    setActivePreset(preset);
    const { width: w, height: h } = origDimensions;

    if (preset === 'none') {
      setTopMargin(0);
      setBottomMargin(0);
      setLeftMargin(0);
      setRightMargin(0);
      return;
    }

    if (preset === 'light') {
      setTopMargin(4);
      setBottomMargin(4);
      setLeftMargin(4);
      setRightMargin(4);
      return;
    }

    if (preset === 'standard') {
      setTopMargin(8);
      setBottomMargin(8);
      setLeftMargin(8);
      setRightMargin(8);
      return;
    }

    if (preset === 'heavy') {
      setTopMargin(15);
      setBottomMargin(15);
      setLeftMargin(15);
      setRightMargin(15);
      return;
    }

    if (preset === 'header-footer') {
      setTopMargin(14);
      setBottomMargin(14);
      setLeftMargin(2);
      setRightMargin(2);
      return;
    }

    if (preset === 'sides') {
      setTopMargin(2);
      setBottomMargin(2);
      setLeftMargin(14);
      setRightMargin(14);
      return;
    }

    // Aspect Ratio Calculations
    let targetRatio = 1;
    if (preset === 'square') targetRatio = 1;
    else if (preset === '16:9') targetRatio = 16 / 9;
    else if (preset === '4:3') targetRatio = 4 / 3;
    else if (preset === '9:16') targetRatio = 9 / 16;
    else if (preset === '3:2') targetRatio = 3 / 2;
    else return;

    if (w > 0 && h > 0) {
      const currentRatio = w / h;
      if (currentRatio > targetRatio) {
        // Image is wider than target ratio: crop sides
        const targetW = h * targetRatio;
        const diffPct = Math.max(0, ((w - targetW) / w) * 100);
        const side = Math.round(diffPct / 2);
        setLeftMargin(side);
        setRightMargin(side);
        setTopMargin(0);
        setBottomMargin(0);
      } else {
        // Image is taller than target ratio: crop top/bottom
        const targetH = w / targetRatio;
        const diffPct = Math.max(0, ((h - targetH) / h) * 100);
        const side = Math.round(diffPct / 2);
        setTopMargin(side);
        setBottomMargin(side);
        setLeftMargin(0);
        setRightMargin(0);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Unified Pointer (Mouse + Touch) Drag Handling
  // ---------------------------------------------------------------------------
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    handle: DragHandle
  ) => {
    if (!previewRef.current) return;
    e.stopPropagation();
    e.preventDefault();

    const rect = previewRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    dragInfo.current = {
      handle,
      startX: xPct,
      startY: yPct,
      initLeft: leftMargin,
      initRight: rightMargin,
      initTop: topMargin,
      initBottom: bottomMargin,
    };
    setIsDragging(true);
    setActivePreset('custom');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfo.current || !previewRef.current) return;
    e.preventDefault();

    const rect = previewRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const { handle, startX, startY, initLeft, initRight, initTop, initBottom } = dragInfo.current;
    const MIN_SIZE = 4; // minimum 4% crop area width/height

    if (handle === 'draw') {
      // User is clicking and dragging on the preview to create/draw a new box
      const left = Math.max(0, Math.min(startX, xPct));
      const right = Math.max(0, 100 - Math.max(startX, xPct));
      const top = Math.max(0, Math.min(startY, yPct));
      const bottom = Math.max(0, 100 - Math.max(startY, yPct));

      if (100 - left - right >= MIN_SIZE) {
        setLeftMargin(Math.round(left));
        setRightMargin(Math.round(right));
      }
      if (100 - top - bottom >= MIN_SIZE) {
        setTopMargin(Math.round(top));
        setBottomMargin(Math.round(bottom));
      }
      return;
    }

    const dx = xPct - startX;
    const dy = yPct - startY;

    if (handle === 'move') {
      // Moving the entire box
      const boxW = 100 - initLeft - initRight;
      const boxH = 100 - initTop - initBottom;

      let newLeft = initLeft + dx;
      let newTop = initTop + dy;

      newLeft = Math.max(0, Math.min(100 - boxW, newLeft));
      newTop = Math.max(0, Math.min(100 - boxH, newTop));

      const newRight = 100 - newLeft - boxW;
      const newBottom = 100 - newTop - boxH;

      setLeftMargin(Math.round(newLeft));
      setRightMargin(Math.round(newRight));
      setTopMargin(Math.round(newTop));
      setBottomMargin(Math.round(newBottom));
      return;
    }

    // Handles
    if (handle === 'nw' || handle === 'w' || handle === 'sw') {
      const maxLeft = 100 - initRight - MIN_SIZE;
      const newLeft = Math.max(0, Math.min(maxLeft, initLeft + dx));
      setLeftMargin(Math.round(newLeft));
    }

    if (handle === 'ne' || handle === 'e' || handle === 'se') {
      const maxRight = 100 - initLeft - MIN_SIZE;
      const newRight = Math.max(0, Math.min(maxRight, initRight - dx));
      setRightMargin(Math.round(newRight));
    }

    if (handle === 'nw' || handle === 'n' || handle === 'ne') {
      const maxTop = 100 - initBottom - MIN_SIZE;
      const newTop = Math.max(0, Math.min(maxTop, initTop + dy));
      setTopMargin(Math.round(newTop));
    }

    if (handle === 'sw' || handle === 's' || handle === 'se') {
      const maxBottom = 100 - initTop - MIN_SIZE;
      const newBottom = Math.max(0, Math.min(maxBottom, initBottom - dy));
      setBottomMargin(Math.round(newBottom));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragInfo.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      dragInfo.current = null;
      setIsDragging(false);
    }
  };

  // Calculate actual pixel coordinates
  const cropPixels = {
    left: Math.round((leftMargin / 100) * (origDimensions.width || 800)),
    top: Math.round((topMargin / 100) * (origDimensions.height || 600)),
    width: Math.max(1, Math.round((origDimensions.width || 800) * (1 - (leftMargin + rightMargin) / 100))),
    height: Math.max(1, Math.round((origDimensions.height || 600) * (1 - (topMargin + bottomMargin) / 100))),
  };

  const hasActiveCrop = topMargin > 0 || bottomMargin > 0 || leftMargin > 0 || rightMargin > 0;

  // Approximate aspect ratio label
  const getAspectRatioLabel = () => {
    if (!cropPixels.width || !cropPixels.height) return '';
    const ratio = cropPixels.width / cropPixels.height;
    if (Math.abs(ratio - 1) < 0.04) return '1:1 Square';
    if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9 Wide';
    if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3 Standard';
    if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16 Story';
    if (Math.abs(ratio - 3 / 2) < 0.05) return '3:2 Photo';
    return `${ratio.toFixed(2)}:1`;
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
      // 1. Primary: Instant client-side crop in browser (handles 10MB+ phone photos, 0ms upload, no 413 limits)
      try {
        let sourceImg: CanvasImageSource | null = null;
        if (typeof createImageBitmap !== 'undefined') {
          try {
            sourceImg = await createImageBitmap(file, { imageOrientation: 'from-image' });
          } catch {}
        }
        if (!sourceImg && originalPreviewUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = originalPreviewUrl;
          });
          sourceImg = img;
        }

        if (sourceImg) {
          const canvas = document.createElement('canvas');
          canvas.width = cropPixels.width;
          canvas.height = cropPixels.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas not supported');

          ctx.drawImage(
            sourceImg,
            cropPixels.left,
            cropPixels.top,
            cropPixels.width,
            cropPixels.height,
            0,
            0,
            cropPixels.width,
            cropPixels.height
          );

          if ('close' in sourceImg && typeof (sourceImg as any).close === 'function') {
            (sourceImg as any).close();
          }

          const mime = file.type || 'image/jpeg';
          const dataUrl = canvas.toDataURL(mime, 0.92);
          const approxSize = Math.round((dataUrl.length * 3) / 4);

          await finishProgress(() => {
            setResult({
              success: true,
              originalName: file.name,
              originalSize: file.size,
              compressedSize: approxSize,
              width: cropPixels.width,
              height: cropPixels.height,
              format: mime.split('/')[1] || 'jpeg',
              dataUrl,
            });
          });
          return;
        }
      } catch (clientErr) {
        console.warn('Client-side crop fallback to server:', clientErr);
      }

      // 2. Server fallback
      const formData = new FormData();
      formData.append('file', file);
      formData.append('crop', JSON.stringify(cropPixels));

      const res = await fetch('/api/transform-image', {
        method: 'POST',
        body: formData,
      });

      const data = await safeFetchJson(res);

      await finishProgress(() => {
        setResult(data);
      });
    } catch (err: any) {
      resetProgress();
      setError(err.message || 'Error occurred while cropping image.');
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setTopMargin(0);
    setBottomMargin(0);
    setLeftMargin(0);
    setRightMargin(0);
    setActivePreset('none');
    scrollToTool();
  };

  return (
    <div className="w-full space-y-6">
      {files.length === 0 && (
        <UploadZone
          accept="image/*, .jpg, .jpeg, .jfif, .pjpeg, .pjp, .png, .webp, .avif, .bmp, .heic, .heif"
          files={files}
          onFilesSelected={setFiles}
          title={t('uploadImageToCrop', 'Upload image to crop')}
          subtitle={t('cropSubtitle', 'Interactive draggable crop box, aspect ratio presets, and pixel-precision trimming')}
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* File summary bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300 gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-base-200 border border-base-300 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                {originalPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={originalPreviewUrl}
                    alt="Thumb"
                    className="w-full h-full object-cover"
                    onError={() => {
                      try {
                        setOriginalPreviewUrl(URL.createObjectURL(files[0]));
                      } catch {}
                    }}
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-base-content/40" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs sm:max-w-md">
                  {files[0].name}
                </p>
                <div className="flex items-center gap-2 pt-0.5 text-xs text-base-content/60 flex-wrap">
                  <span>{t('originalSize', 'Original')}: <strong className="text-base-content font-mono">{formatBytes(files[0].size)}</strong></span>
                  {origDimensions.width > 0 && (
                    <span className="badge badge-sm badge-ghost text-[10px] font-mono">
                      {origDimensions.width} × {origDimensions.height} px
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="btn btn-ghost btn-xs sm:btn-sm text-base-content/60 hover:text-error"
            >
              {t('changeFile', 'Change Image')}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Interactive Visual Viewport with Shaded Cutouts and Draggable Handles */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-base-200/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-base-300">
              <div className="flex items-center justify-between w-full mb-3 text-xs text-base-content/70">
                <span className="font-semibold flex items-center gap-1.5">
                  <Crop className="w-4 h-4 text-primary" />
                  {t('liveCropCanvas', 'Live Crop Canvas')}
                </span>
                <span className="text-[11px] text-base-content/60 font-mono">
                  {cropPixels.width} × {cropPixels.height} px ({getAspectRatioLabel()})
                </span>
              </div>

              {originalPreviewUrl ? (
                <div
                  ref={previewRef}
                  onPointerDown={(e) => handlePointerDown(e, 'draw')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative max-w-full max-h-[460px] rounded-none border border-base-300 shadow-md inline-block select-none bg-white cursor-crosshair overflow-hidden touch-none"
                >
                  {/* Base Image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={originalPreviewUrl}
                    alt="Original Crop Source"
                    className="max-h-[440px] w-auto max-w-full object-contain block pointer-events-none select-none"
                    draggable={false}
                    onError={() => {
                      try {
                        setOriginalPreviewUrl(URL.createObjectURL(files[0]));
                      } catch {}
                    }}
                  />

                  {/* Draw hint overlay when whole image is selected */}
                  {!hasActiveCrop && !isDragging && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/[0.03] p-4 text-center">
                      <div className="bg-base-100/95 backdrop-blur-sm px-3.5 py-2 rounded-xl shadow-md border border-base-300 flex items-center gap-2 text-xs font-semibold text-base-content/85">
                        <Crop className="w-4 h-4 text-primary animate-pulse" />
                        <span>{t('clickDragToSelectCrop', 'Click & drag to select crop area')}</span>
                      </div>
                    </div>
                  )}

                  {/* Shaded Trim Areas and Active Crop Box */}
                  {(hasActiveCrop || isDragging) && (
                    <>
                      {/* Top shaded mask */}
                      <div
                        style={{ top: 0, left: 0, right: 0, height: `${topMargin}%` }}
                        className="absolute bg-slate-900/50 backdrop-blur-[0.5px] border-b border-red-500/40 pointer-events-none transition-none"
                      />
                      {/* Bottom shaded mask */}
                      <div
                        style={{ bottom: 0, left: 0, right: 0, height: `${bottomMargin}%` }}
                        className="absolute bg-slate-900/50 backdrop-blur-[0.5px] border-t border-red-500/40 pointer-events-none transition-none"
                      />
                      {/* Left shaded mask */}
                      <div
                        style={{
                          top: `${topMargin}%`,
                          bottom: `${bottomMargin}%`,
                          left: 0,
                          width: `${leftMargin}%`,
                        }}
                        className="absolute bg-slate-900/50 backdrop-blur-[0.5px] border-r border-red-500/40 pointer-events-none transition-none"
                      />
                      {/* Right shaded mask */}
                      <div
                        style={{
                          top: `${topMargin}%`,
                          bottom: `${bottomMargin}%`,
                          right: 0,
                          width: `${rightMargin}%`,
                        }}
                        className="absolute bg-slate-900/50 backdrop-blur-[0.5px] border-l border-red-500/40 pointer-events-none transition-none"
                      />

                      {/* ACTIVE CROP BOX (Interactive draggable & resizable, rectangular sharp corners) */}
                      <div
                        onPointerDown={(e) => handlePointerDown(e, 'move')}
                        style={{
                          top: `${topMargin}%`,
                          bottom: `${bottomMargin}%`,
                          left: `${leftMargin}%`,
                          right: `${rightMargin}%`,
                        }}
                        className="absolute border-2 border-emerald-500 bg-emerald-500/5 shadow-2xl cursor-move transition-none rounded-none"
                      >
                        {/* Rule-of-Thirds Grid Lines */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-1/3 left-0 right-0 border-b border-white/30 border-dashed" />
                          <div className="absolute top-2/3 left-0 right-0 border-b border-white/30 border-dashed" />
                          <div className="absolute left-1/3 top-0 bottom-0 border-r border-white/30 border-dashed" />
                          <div className="absolute left-2/3 top-0 bottom-0 border-r border-white/30 border-dashed" />
                        </div>

                        {/* Size badge inside box */}
                        <div className="absolute top-1.5 left-1.5 pointer-events-none z-10">
                          <span className="badge badge-xs bg-emerald-600 text-white font-bold text-[9px] px-1.5 py-0.5 shadow">
                            {cropPixels.width} × {cropPixels.height} px
                          </span>
                        </div>

                        {/* Corner Handles */}
                        {/* Top-Left */}
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 'nw')}
                          className="absolute -top-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-20 touch-none"
                          title="Resize top-left"
                        >
                          <div className="w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md hover:scale-125 transition-transform" />
                        </div>

                        {/* Top-Right */}
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 'ne')}
                          className="absolute -top-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-20 touch-none"
                          title="Resize top-right"
                        >
                          <div className="w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md hover:scale-125 transition-transform" />
                        </div>

                        {/* Bottom-Right */}
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 'se')}
                          className="absolute -bottom-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-20 touch-none"
                          title="Resize bottom-right"
                        >
                          <div className="w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md hover:scale-125 transition-transform" />
                        </div>

                        {/* Bottom-Left */}
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 'sw')}
                          className="absolute -bottom-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-20 touch-none"
                          title="Resize bottom-left"
                        >
                          <div className="w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md hover:scale-125 transition-transform" />
                        </div>

                        {/* Mid-Edge Handles */}
                        {/* Top */}
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 'n')}
                          className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-6 flex items-center justify-center cursor-ns-resize z-10 touch-none"
                          title="Resize top"
                        >
                          <div className="w-5 h-1.5 bg-white border border-emerald-600 rounded-full shadow hover:scale-110 transition-transform" />
                        </div>

                        {/* Bottom */}
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 's')}
                          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-6 flex items-center justify-center cursor-ns-resize z-10 touch-none"
                          title="Resize bottom"
                        >
                          <div className="w-5 h-1.5 bg-white border border-emerald-600 rounded-full shadow hover:scale-110 transition-transform" />
                        </div>

                        {/* Left */}
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 'w')}
                          className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-8 flex items-center justify-center cursor-ew-resize z-10 touch-none"
                          title="Resize left"
                        >
                          <div className="w-1.5 h-5 bg-white border border-emerald-600 rounded-full shadow hover:scale-110 transition-transform" />
                        </div>

                        {/* Right */}
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 'e')}
                          className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-8 flex items-center justify-center cursor-ew-resize z-10 touch-none"
                          title="Resize right"
                        >
                          <div className="w-1.5 h-5 bg-white border border-emerald-600 rounded-full shadow hover:scale-110 transition-transform" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full h-64 bg-base-100 rounded-xl border border-dashed border-base-300 flex flex-col items-center justify-center text-xs text-base-content/50 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span>{t('preparingPreview', 'Loading image preview...')}</span>
                </div>
              )}

              {/* Interaction Hint */}
              <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-base-200/70 border border-base-300 text-[11px] font-medium text-base-content/70 mt-3 shadow-2xs">
                <span className="hidden sm:inline-flex items-center gap-1.5">
                  <Mouse className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{t('cropInteractionHintDesktop', 'Click & drag anywhere to draw a crop box, or drag edges to adjust.')}</span>
                </span>
                <span className="sm:hidden inline-flex items-center gap-1.5">
                  <Pointer className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{t('cropInteractionHintMobile', 'Touch & drag to select or adjust your crop area.')}</span>
                </span>
              </div>
            </div>

            {/* Right: Controls, Aspect Ratios, Presets, and Sliders */}
            <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* 1. Aspect Ratio Presets */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-base-content/75 flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-primary" />
                      {t('aspectRatioPresets', 'Aspect Ratio Presets')}
                    </label>
                    <span className="text-[11px] font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md">
                      {getAspectRatioLabel()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                    {[
                      { id: 'none', label: t('wholeImage', 'Whole Image') },
                      { id: 'square', label: t('square', '1:1 Square') },
                      { id: '16:9', label: t('wide', '16:9 Wide') },
                      { id: '4:3', label: t('classic', '4:3 Classic') },
                      { id: '9:16', label: t('story', '9:16 Story') },
                      { id: '3:2', label: t('photo', '3:2 Photo') },
                    ].map((preset) => {
                      const isSelected = activePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset.id)}
                          className={`h-auto min-h-[38px] py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center flex items-center justify-center leading-snug cursor-pointer select-none ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-xs ring-1 ring-primary'
                              : 'bg-base-100 hover:bg-base-200/80 text-base-content border-base-300'
                          }`}
                        >
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Quick Margin Presets */}
                <div className="space-y-2.5 pt-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-base-content/75 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    {t('quickMarginTrimming', 'Quick Margin Trimming')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                    {[
                      { id: 'light', label: t('marginLight', 'Light (4%)') },
                      { id: 'standard', label: t('marginStandard', 'Standard (8%)') },
                      { id: 'header-footer', label: t('marginHeaderFooter', 'Top / Bottom') },
                      { id: 'sides', label: t('marginSides', 'Sides Only') },
                    ].map((preset) => {
                      const isSelected = activePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset.id)}
                          className={`h-auto min-h-[38px] py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center flex items-center justify-center leading-snug cursor-pointer select-none ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-xs ring-1 ring-primary'
                              : 'bg-base-100 hover:bg-base-200/80 text-base-content border-base-300'
                          }`}
                        >
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Precise Margin Trimming Sliders with Steppers */}
                <div className="space-y-3 p-4 rounded-2xl bg-base-200/40 border border-base-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      {t('preciseMarginTrimming', 'Precise Margin Trimming (%)')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('none')}
                      className="btn btn-ghost btn-xs text-base-content/60 hover:text-error gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('reset', 'Reset')}</span>
                    </button>
                  </div>

                  {/* Top Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-base-content/70">
                      <span>{t('topCutout', 'Top Cutout')}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setTopMargin((v) => Math.max(0, v - 1));
                            setActivePreset('custom');
                          }}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                          title="Decrease top margin"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-bold font-mono text-primary w-16 text-center">
                          {topMargin}% <span className="text-[10px] text-base-content/50">({cropPixels.top}px)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTopMargin((v) => Math.min(45, v + 1));
                            setActivePreset('custom');
                          }}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                          title="Increase top margin"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={topMargin}
                      onChange={(e) => {
                        setTopMargin(parseInt(e.target.value, 10) || 0);
                        setActivePreset('custom');
                      }}
                      className="range range-xs range-primary"
                    />
                  </div>

                  {/* Bottom Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-base-content/70">
                      <span>{t('bottomCutout', 'Bottom Cutout')}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setBottomMargin((v) => Math.max(0, v - 1));
                            setActivePreset('custom');
                          }}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                          title="Decrease bottom margin"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-bold font-mono text-primary w-16 text-center">
                          {bottomMargin}%
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setBottomMargin((v) => Math.min(45, v + 1));
                            setActivePreset('custom');
                          }}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                          title="Increase bottom margin"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={bottomMargin}
                      onChange={(e) => {
                        setBottomMargin(parseInt(e.target.value, 10) || 0);
                        setActivePreset('custom');
                      }}
                      className="range range-xs range-primary"
                    />
                  </div>

                  {/* Left Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-base-content/70">
                      <span>{t('leftCutout', 'Left Cutout')}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setLeftMargin((v) => Math.max(0, v - 1));
                            setActivePreset('custom');
                          }}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                          title="Decrease left margin"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-bold font-mono text-primary w-16 text-center">
                          {leftMargin}% <span className="text-[10px] text-base-content/50">({cropPixels.left}px)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLeftMargin((v) => Math.min(45, v + 1));
                            setActivePreset('custom');
                          }}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                          title="Increase left margin"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={leftMargin}
                      onChange={(e) => {
                        setLeftMargin(parseInt(e.target.value, 10) || 0);
                        setActivePreset('custom');
                      }}
                      className="range range-xs range-primary"
                    />
                  </div>

                  {/* Right Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-base-content/70">
                      <span>{t('rightCutout', 'Right Cutout')}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setRightMargin((v) => Math.max(0, v - 1));
                            setActivePreset('custom');
                          }}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                          title="Decrease right margin"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-bold font-mono text-primary w-16 text-center">
                          {rightMargin}%
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setRightMargin((v) => Math.min(45, v + 1));
                            setActivePreset('custom');
                          }}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                          title="Increase right margin"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={rightMargin}
                      onChange={(e) => {
                        setRightMargin(parseInt(e.target.value, 10) || 0);
                        setActivePreset('custom');
                      }}
                      className="range range-xs range-primary"
                    />
                  </div>
                </div>

                {/* Crop Coordinates Readout Badge */}
                <div className="p-3 rounded-2xl bg-base-200/60 border border-base-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs font-mono">
                  <span className="text-base-content/70">
                    Pos: <strong>X: {cropPixels.left}px, Y: {cropPixels.top}px</strong>
                  </span>
                  <span className="text-primary font-bold">
                    Crop: {cropPixels.width} × {cropPixels.height} px
                  </span>
                </div>
              </div>

              {error && (
                <div className="alert alert-error text-xs rounded-2xl py-3 shadow-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Button */}
              <ProcessingButton
                onClick={handleProcess}
                isProcessing={isProcessing}
                progress={progress}
                loadingLabel={t('cropping', 'Cropping')}
                disabled={!hasActiveCrop}
              >
                {!hasActiveCrop ? (
                  <>
                    <Crop className="w-5 h-5" />
                    <span>{t('selectCropAreaFirst', 'Select Crop Area on Image First')}</span>
                  </>
                ) : (
                  <>
                    <Crop className="w-5 h-5" />
                    <span>{t('cropImageBtn', 'Crop Image')} ({cropPixels.width} × {cropPixels.height} px)</span>
                  </>
                )}
              </ProcessingButton>
            </div>
          </div>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="space-y-6">
          <div className="p-4 rounded-3xl bg-base-100 border border-base-300 flex items-center justify-center bg-transparency-grid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.dataUrl}
              alt="Cropped preview"
              className="max-h-[380px] object-contain rounded-xl shadow-lg"
            />
          </div>

          <ResultCard
            originalSize={result.originalSize}
            newSize={result.compressedSize}
            filename={`cropped_${result.originalName}`}
            dataUrl={result.dataUrl}
            format={result.format}
            dimensions={{ width: result.width, height: result.height }}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
