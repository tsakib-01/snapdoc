'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Loader2,
  AlertCircle,
  Plus,
  X,
  ArrowRight,
  RotateCcw,
  Download,
  Archive,
  Maximize2,
  Percent,
  Lock,
  Unlock,
  Check,
  Scaling,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ComparisonViewer from '@/components/ui/ComparisonViewer';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';
import { scrollToTool } from '@/lib/utils/scrollHelper';
import { getSafeImagePreview } from '@/lib/utils/previewHelper';
import JSZip from 'jszip';

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
}

const SOCIAL_PRESETS = [
  { name: 'Instagram Square', width: 1080, height: 1080 },
  { name: 'Instagram Story', width: 1080, height: 1920 },
  { name: 'YouTube Thumbnail', width: 1280, height: 720 },
  { name: 'Twitter / X Header', width: 1500, height: 500 },
  { name: 'Facebook Cover', width: 820, height: 312 },
  { name: 'Web Banner 728×90', width: 728, height: 90 },
];

export default function ResizerTool() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [mode, setMode] = useState<'pixels' | 'percentage'>('pixels');
  const [width, setWidth] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [maintainRatio, setMaintainRatio] = useState<boolean>(true);
  const [doNotEnlarge, setDoNotEnlarge] = useState<boolean>(false);
  const [scalePercent, setScalePercent] = useState<number>(50); // Capped at 100%
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  useEffect(() => {
    if (results && results.length > 0) {
      scrollToTool({ force: true });
    }
  }, [results]);

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  // Helper to load natural dimensions for uploaded files
  const loadFiles = async (filesToAdd: File[]) => {
    if (!filesToAdd || filesToAdd.length === 0) return;
    setError(null);

    try {
      const newItems: ImageItem[] = await Promise.all(
        filesToAdd.map(async (file) => {
          let previewUrl = '';
          let w = 800;
          let h = 600;
          try {
            previewUrl = URL.createObjectURL(file);
          } catch {}
          try {
            const preview = await getSafeImagePreview(file);
            previewUrl = preview.previewUrl || previewUrl;
            w = preview.width || w;
            h = preview.height || h;
          } catch {
            // keep fallback
          }
          return {
            id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
            file,
            previewUrl,
            originalWidth: w,
            originalHeight: h,
          };
        })
      );

      setImages((prev) => {
        const updated = [...prev, ...newItems];
        if (prev.length === 0 && updated.length > 0) {
          setWidth(updated[0].originalWidth);
          setHeight(updated[0].originalHeight);
          setSelectedPreset(null);
        }
        return updated;
      });
    } catch (err: any) {
      setError(err.message || 'Error loading one or more images.');
    }
  };

  const primaryImage = images[0];

  const handleWidthChange = (val: number | '') => {
    setSelectedPreset(null);
    setWidth(val);
    if (maintainRatio && val !== '' && primaryImage?.originalWidth > 0) {
      const calculatedH = Math.max(1, Math.round((primaryImage.originalHeight / primaryImage.originalWidth) * val));
      setHeight(calculatedH);
    }
  };

  const handleHeightChange = (val: number | '') => {
    setSelectedPreset(null);
    setHeight(val);
    if (maintainRatio && val !== '' && primaryImage?.originalHeight > 0) {
      const calculatedW = Math.max(1, Math.round((primaryImage.originalWidth / primaryImage.originalHeight) * val));
      setWidth(calculatedW);
    }
  };

  const handleResetToOriginal = () => {
    setSelectedPreset(null);
    setMaintainRatio(true);
    if (primaryImage) {
      setWidth(primaryImage.originalWidth);
      setHeight(primaryImage.originalHeight);
    }
  };

  const handlePreset = (presetName: string, pWidth: number, pHeight: number) => {
    if (selectedPreset === presetName) {
      // If user clicks the active preset again, revert to original default size
      handleResetToOriginal();
      return;
    }
    setSelectedPreset(presetName);
    setMode('pixels');
    setMaintainRatio(false);
    setWidth(pWidth);
    setHeight(pHeight);
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      if (updated.length === 0) {
        setWidth('');
        setHeight('');
      } else if (prev[0]?.id === id && updated.length > 0) {
        if (maintainRatio) {
          setWidth(updated[0].originalWidth);
          setHeight(updated[0].originalHeight);
        }
      }
      return updated;
    });
  };

  const handleReset = () => {
    images.forEach((img) => {
      if (img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    setImages([]);
    setResults(null);
    setError(null);
    setWidth('');
    setHeight('');
    setScalePercent(50);
    setSelectedPreset(null);
    setProcessProgress(null);
    scrollToTool();
  };

  // Calculate preview target dimensions for a specific image item
  const getTargetDimensions = (item: ImageItem) => {
    if (mode === 'percentage') {
      // Percentage strictly capped at 100%
      const safePct = Math.min(100, Math.max(1, scalePercent || 50));
      const factor = safePct / 100;
      let targetW = Math.max(1, Math.round(item.originalWidth * factor));
      let targetH = Math.max(1, Math.round(item.originalHeight * factor));
      if (doNotEnlarge && (targetW > item.originalWidth || targetH > item.originalHeight)) {
        targetW = item.originalWidth;
        targetH = item.originalHeight;
      }
      return { width: targetW, height: targetH };
    }

    const inputW = typeof width === 'number' && width > 0 ? width : item.originalWidth;
    const inputH = typeof height === 'number' && height > 0 ? height : item.originalHeight;

    if (maintainRatio) {
      const ratio = item.originalWidth / item.originalHeight;
      let targetW = inputW;
      let targetH = Math.max(1, Math.round(inputW / ratio));

      if (doNotEnlarge && (targetW > item.originalWidth || targetH > item.originalHeight)) {
        targetW = item.originalWidth;
        targetH = item.originalHeight;
      }
      return { width: targetW, height: targetH };
    }

    let targetW = inputW;
    let targetH = inputH;
    if (doNotEnlarge) {
      if (targetW > item.originalWidth) targetW = item.originalWidth;
      if (targetH > item.originalHeight) targetH = item.originalHeight;
    }
    return { width: targetW, height: targetH };
  };

  // High quality client-side canvas resizing (instant, private, eliminates "failed to fetch")
  const resizeImageInBrowser = async (
    item: ImageItem,
    targetWidth: number,
    targetHeight: number
  ): Promise<any> => {
    let source: ImageBitmap | HTMLImageElement;
    try {
      source = await createImageBitmap(item.file, { imageOrientation: 'from-image' });
    } catch {
      source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = item.previewUrl;
      });
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const isPng = item.file.type.includes('png') || item.file.name.toLowerCase().endsWith('.png');
    if (!isPng) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    const srcW = 'naturalWidth' in source ? source.naturalWidth : source.width;
    const srcH = 'naturalHeight' in source ? source.naturalHeight : source.height;

    ctx.drawImage(source, 0, 0, srcW, srcH, 0, 0, targetWidth, targetHeight);

    const outMime = isPng ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(outMime, 0.92);

    const base64Data = dataUrl.split(',')[1] || '';
    const compressedSize = Math.round((base64Data.length * 3) / 4);
    const originalSize = item.file.size;
    const reductionPercentage =
      originalSize > 0
        ? Math.max(0, parseFloat((((originalSize - compressedSize) / originalSize) * 100).toFixed(1)))
        : 0;

    return {
      success: true,
      originalName: item.file.name,
      originalSize,
      compressedSize,
      reductionPercentage,
      width: targetWidth,
      height: targetHeight,
      originalWidth: item.originalWidth,
      originalHeight: item.originalHeight,
      format: isPng ? 'png' : 'jpeg',
      mimeType: outMime,
      dataUrl,
      originalPreviewUrl: item.previewUrl,
    };
  };

  const handleProcess = async () => {
    if (images.length === 0) return;
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setError(null);
    setIsProcessing(true);
    setResults(null);
    setProcessProgress({ current: 0, total: images.length });

    try {
      const processedResults: any[] = [];

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        setProcessProgress({ current: i + 1, total: images.length });

        const dims = getTargetDimensions(item);

        try {
          // 1. Primary: Direct high-fidelity client-side resizing (instant, avoids network "failed to fetch")
          const clientResult = await resizeImageInBrowser(item, dims.width, dims.height);
          processedResults.push(clientResult);
        } catch {
          // 2. Server fallback if client-side canvas has an exotic issue
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('width', dims.width.toString());
          formData.append('height', dims.height.toString());
          formData.append('maintainAspectRatio', maintainRatio ? 'true' : 'false');
          formData.append('withoutEnlargement', doNotEnlarge ? 'true' : 'false');
          if (mode === 'percentage') {
            formData.append('scalePercent', Math.min(100, Math.max(1, scalePercent)).toString());
          }

          const res = await fetch('/api/resize-image', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || `Failed to resize ${item.file.name}`);
          }

          processedResults.push({
            ...data,
            originalPreviewUrl: item.previewUrl,
          });
        }
      }

      setResults(processedResults);
    } catch (err: any) {
      setError(err.message || 'Error resizing image(s).');
    } finally {
      setIsProcessing(false);
      setProcessProgress(null);
    }
  };

  const handleDownloadZip = async () => {
    if (!results || results.length === 0) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      results.forEach((r, idx) => {
        const base64Data = r.dataUrl.split(',')[1];
        const ext = r.format || 'jpg';
        const cleanName = r.originalName.replace(/\.[^/.]+$/, '');
        const filename = `resized_${r.width}x${r.height}_${cleanName}_${idx + 1}.${ext}`;
        zip.file(filename, base64Data, { base64: true });
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resized_images_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const totalOriginalSize = images.reduce((acc, it) => acc + it.file.size, 0);

  return (
    <div className="w-full space-y-6">
      {/* Hidden file input for adding more images */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        multiple
        accept="image/*, .jpg, .jpeg, .jfif, .pjpeg, .pjp, .png, .webp, .avif, .bmp"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            loadFiles(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Upload Zone when no images loaded */}
      {images.length === 0 && (
        <UploadZone
          accept="image/*, .jpg, .jpeg, .jfif, .pjpeg, .pjp, .png, .webp, .avif, .bmp"
          multiple={true}
          maxFiles={30}
          onFilesSelected={loadFiles}
          title="Drop images here to resize"
          subtitle="Resize photos by exact pixels or percentage online"
        />
      )}

      {/* Active Workspace when images are loaded */}
      {images.length > 0 && !results && (
        <div className="flex flex-col lg:flex-row items-start gap-6 animate-in fade-in duration-150">
          {/* LEFT: Image Gallery / Workspace (matches PDF images layout) */}
          <div className="flex-1 w-full min-w-0 space-y-4">
            {/* Top Bar with Sequence & Clear All (consistent with PDF tools) */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-base-200/50 border border-base-300">
              <div>
                <span className="text-xs sm:text-sm font-bold text-base-content block">
                  Resize Images ({images.length} {images.length === 1 ? 'image' : 'images'})
                </span>
                <span className="text-xs text-base-content/60">
                  Total size: {formatBytes(totalOriginalSize)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => hiddenFileInputRef.current?.click()}
                  className="btn btn-ghost btn-xs sm:btn-sm text-primary hover:bg-primary/10 gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add More</span>
                </button>
                <div className="w-px h-4 bg-base-300"></div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-ghost btn-xs sm:btn-sm text-base-content/60 hover:text-error gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {/* Visual Image Thumbnail Preview Grid (matches PDF tools card layout) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 p-1">
              {images.map((item, idx) => {
                const dims = getTargetDimensions(item);
                return (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl bg-base-100 border-2 border-base-300 hover:border-primary/60 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
                  >
                    {/* Image Thumbnail Container */}
                    <div className="h-32 sm:h-36 w-full bg-base-200/40 p-2 flex items-center justify-center relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="h-full w-full object-contain drop-shadow-sm rounded-none"
                      />

                      {/* Item Sequence Badge */}
                      <span className="absolute top-2 left-2 badge badge-sm bg-neutral/80 text-white backdrop-blur-sm font-bold text-[10px] shadow">
                        #{idx + 1}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(item.id)}
                        className="absolute top-1.5 right-1.5 btn btn-circle btn-xs btn-error text-white opacity-80 hover:opacity-100 shadow transition-opacity"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Info & Dimension Badges */}
                    <div className="p-2.5 bg-base-100 border-t border-base-200 flex flex-col items-center justify-between gap-1.5 text-xs">
                      <div className="w-full text-center px-1">
                        <p className="font-semibold text-base-content truncate text-[11px]" title={item.file.name}>
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-base-content/50">
                          {formatBytes(item.file.size)}
                        </p>
                      </div>

                      {/* Dimension Arrow Badge */}
                      <div className="flex items-center justify-center gap-1.5 pt-1.5 border-t border-base-200/70 w-full flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-base-200 text-base-content/70 text-[10px] font-mono font-medium">
                          {item.originalWidth}×{item.originalHeight}
                        </span>
                        <ArrowRight className="w-3 h-3 text-base-content/40 shrink-0" />
                        <span className="px-1.5 py-0.5 rounded bg-primary text-primary-content text-[10px] font-mono font-bold shadow-xs">
                          {dims.width}×{dims.height}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add More Images Card in Grid */}
              <div
                onClick={() => hiddenFileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-base-300 hover:border-primary/60 hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center p-4 min-h-[160px] text-center transition-all group"
                title="Add more photos"
              >
                <div className="w-10 h-10 rounded-xl bg-base-200 group-hover:bg-primary/10 text-base-content/60 group-hover:text-primary flex items-center justify-center mb-2 transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-base-content/70 group-hover:text-primary">
                  Add Images
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: SnapDoc Styled Resize Settings Panel */}
          <div className="w-full lg:w-80 xl:w-96 rounded-2xl bg-base-100 border border-base-300 p-5 shadow-lg space-y-5 shrink-0 lg:sticky lg:top-20">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-base-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  <Scaling className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-base-content leading-tight">
                    Resize Settings
                  </h2>
                  <p className="text-[11px] text-base-content/60">
                    Adjust dimensions or scale
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Segmented Tab Selector (SnapDoc native style) */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-base-200/70 border border-base-300/60 gap-1">
              <button
                type="button"
                onClick={() => setMode('pixels')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'pixels'
                    ? 'bg-primary text-primary-content shadow-xs'
                    : 'text-base-content/70 hover:text-base-content hover:bg-base-100/50'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>By Pixels</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('percentage')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'percentage'
                    ? 'bg-primary text-primary-content shadow-xs'
                    : 'text-base-content/70 hover:text-base-content hover:bg-base-100/50'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>By Percentage</span>
              </button>
            </div>

            {/* BY PIXELS CONTROLS */}
            {mode === 'pixels' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-base-content">Target Dimensions</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !maintainRatio;
                      setMaintainRatio(nextVal);
                      if (nextVal && width !== '' && primaryImage?.originalWidth) {
                        const calcH = Math.max(
                          1,
                          Math.round((primaryImage.originalHeight / primaryImage.originalWidth) * Number(width))
                        );
                        setHeight(calcH);
                      }
                    }}
                    className={`btn btn-xs h-auto min-h-[1.75rem] py-1 px-2 rounded-lg gap-1 leading-none ${
                      maintainRatio ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost text-base-content/60'
                    }`}
                    title={maintainRatio ? 'Aspect ratio locked' : 'Aspect ratio free'}
                  >
                    {maintainRatio ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>{maintainRatio ? 'Ratio Locked' : 'Ratio Free'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-base-content/70 mb-1 block">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={width}
                      onChange={(e) =>
                        handleWidthChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                      }
                      placeholder="Width"
                      className="input input-sm input-bordered w-full rounded-xl font-bold font-mono text-center text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-base-content/70 mb-1 block">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={height}
                      onChange={(e) =>
                        handleHeightChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                      }
                      placeholder="Height"
                      className="input input-sm input-bordered w-full rounded-xl font-bold font-mono text-center text-xs"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-base-content/80 select-none">
                    <input
                      type="checkbox"
                      checked={doNotEnlarge}
                      onChange={(e) => setDoNotEnlarge(e.target.checked)}
                      className="checkbox checkbox-xs checkbox-primary rounded"
                    />
                    <span>Do not enlarge if smaller</span>
                  </label>
                </div>
              </div>
            )}

            {/* BY PERCENTAGE CONTROLS (CAPPED STRICTLY AT 100%) */}
            {mode === 'percentage' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-base-content">Scale Down (Max 100%)</span>
                  <span className="badge badge-primary font-bold text-xs px-2 py-0.5 font-mono">
                    {scalePercent}%
                  </span>
                </div>

                {/* Percentage Preset Buttons - Up to 100% only */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setScalePercent(pct)}
                      className={`btn btn-xs rounded-lg font-bold font-mono ${
                        scalePercent === pct
                          ? 'btn-primary text-primary-content shadow-xs'
                          : 'btn-ghost bg-base-200/70 border border-base-300/60'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {/* Slider (min 1, max 100) */}
                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={scalePercent}
                    onChange={(e) =>
                      setScalePercent(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))
                    }
                    className="range range-primary range-xs w-full"
                  />
                  <div className="flex justify-between text-[10px] text-base-content/50 font-mono px-0.5">
                    <span>1%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-base-content/80 select-none">
                    <input
                      type="checkbox"
                      checked={doNotEnlarge}
                      onChange={(e) => setDoNotEnlarge(e.target.checked)}
                      className="checkbox checkbox-xs checkbox-primary rounded"
                    />
                    <span>Do not enlarge if smaller</span>
                  </label>
                </div>
              </div>
            )}

            {/* Collapsible Social Presets */}
            <details className="collapse collapse-arrow bg-base-200/40 rounded-xl border border-base-300/70">
              <summary className="collapse-title text-xs font-bold text-base-content/80 py-2.5 min-h-0 flex items-center justify-between">
                <span>Popular Social Presets</span>
                {selectedPreset && (
                  <span className="badge badge-xs badge-primary font-normal mr-6">
                    {selectedPreset}
                  </span>
                )}
              </summary>
              <div className="collapse-content space-y-1.5 pt-1">
                {/* Default / No Preset Option */}
                <button
                  type="button"
                  onClick={handleResetToOriginal}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    !selectedPreset
                      ? 'bg-primary/10 text-primary font-bold border border-primary/20'
                      : 'hover:bg-base-100 text-base-content/80 hover:text-primary font-medium'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 opacity-70" />
                    Default (Original Size - No Preset)
                  </span>
                  <span className="font-mono text-[11px] opacity-70">
                    {primaryImage ? `${primaryImage.originalWidth}×${primaryImage.originalHeight}` : 'Original'}
                  </span>
                </button>

                {SOCIAL_PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.name;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handlePreset(preset.name, preset.width, preset.height)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-content font-bold shadow-xs'
                          : 'hover:bg-base-100 text-base-content/80 hover:text-primary font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {preset.name}
                      </span>
                      <span className={`font-mono text-[11px] ${isSelected ? 'text-primary-content/90' : 'opacity-60'}`}>
                        {preset.width}×{preset.height}
                      </span>
                    </button>
                  );
                })}
              </div>
            </details>

            {/* Error Message */}
            {error && (
              <div className="alert alert-error text-xs rounded-xl py-2.5 shadow-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action CTA Button */}
            <button
              type="button"
              onClick={handleProcess}
              disabled={isProcessing || images.length === 0}
              className="btn btn-primary btn-md sm:btn-lg rounded-xl w-full font-bold text-sm sm:text-base shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer h-auto min-h-[3rem] py-3 px-3 text-center leading-snug"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>
                    Resizing{' '}
                    {processProgress
                      ? `${processProgress.current}/${processProgress.total}...`
                      : '...'}
                  </span>
                </>
              ) : (
                <>
                  <span>Resize {images.length > 1 ? `${images.length} Images` : 'Image'}</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* RESULTS VIEW */}
      {results && results.length > 0 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Single Image Result */}
          {results.length === 1 && (
            <div className="space-y-6">
              <ComparisonViewer
                originalUrl={results[0].originalPreviewUrl}
                processedUrl={results[0].dataUrl}
                originalSize={results[0].originalSize}
                processedSize={results[0].compressedSize}
                originalDimensions={{
                  width: results[0].originalWidth,
                  height: results[0].originalHeight,
                }}
                processedDimensions={{
                  width: results[0].width,
                  height: results[0].height,
                }}
              />

              <ResultCard
                originalSize={results[0].originalSize}
                newSize={results[0].compressedSize}
                reductionPercentage={results[0].reductionPercentage}
                filename={`resized_${results[0].width}x${results[0].height}_${results[0].originalName}`}
                dataUrl={results[0].dataUrl}
                format={results[0].format}
                dimensions={{ width: results[0].width, height: results[0].height }}
                onReset={handleReset}
                hideHeader={true}
              />
            </div>
          )}

          {/* Multiple Images Results */}
          {results.length > 1 && (
            <div className="space-y-6">
              {/* Batch Summary Header */}
              <div className="p-4 sm:p-6 rounded-2xl bg-base-100 border border-base-300 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shadow-xs">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-base-content">
                      {results.length} Images Successfully Resized!
                    </h3>
                    <p className="text-xs text-base-content/60">
                      Total original:{' '}
                      {formatBytes(results.reduce((acc, r) => acc + r.originalSize, 0))} → New:{' '}
                      {formatBytes(results.reduce((acc, r) => acc + r.compressedSize, 0))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={isZipping}
                    className="btn btn-primary rounded-xl font-bold gap-2 shadow-lg shadow-primary/20 flex-1 sm:flex-none text-xs sm:text-sm"
                  >
                    {isZipping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating ZIP...</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4" />
                        <span>Download All (ZIP)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn btn-ghost rounded-xl text-xs gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resize More</span>
                  </button>
                </div>
              </div>

              {/* Grid of Results */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {results.map((r, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm flex flex-col justify-between space-y-2.5"
                  >
                    <div className="w-full aspect-[4/3] bg-base-200/50 rounded-xl overflow-hidden flex items-center justify-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.dataUrl}
                        alt={r.originalName}
                        className="max-w-full max-h-full object-contain rounded-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-base-content truncate" title={r.originalName}>
                        {r.originalName}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-base-content/60">
                        <span>
                          {r.width} × {r.height} px
                        </span>
                        <span className="font-semibold text-primary">{formatBytes(r.compressedSize)}</span>
                      </div>
                    </div>

                    <a
                      href={r.dataUrl}
                      download={`resized_${r.width}x${r.height}_${r.originalName}`}
                      className="btn btn-xs sm:btn-sm btn-outline btn-primary rounded-xl w-full gap-1.5 font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
