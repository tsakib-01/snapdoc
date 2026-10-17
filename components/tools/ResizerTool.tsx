'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  AlertCircle,
  Check,
  Plus,
  X,
  ArrowRight,
  ArrowRightCircle,
  RotateCcw,
  Download,
  Archive,
  Layers,
  ChevronDown,
  Sparkles,
  FileImage,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ComparisonViewer from '@/components/ui/ComparisonViewer';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';
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

function PixelGridResizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="3" height="3" fill="currentColor" rx="0.5" />
      <rect x="7" y="11" width="3" height="3" fill="currentColor" rx="0.5" />
      <rect x="3" y="15" width="3" height="3" fill="currentColor" rx="0.5" />
      <rect x="7" y="15" width="3" height="3" fill="currentColor" rx="0.5" />
      <rect x="11" y="15" width="3" height="3" fill="currentColor" rx="0.5" />
      <rect x="3" y="19" width="3" height="3" fill="currentColor" rx="0.5" />
      <rect x="7" y="19" width="3" height="3" fill="currentColor" rx="0.5" />
      <rect x="11" y="19" width="3" height="3" fill="currentColor" rx="0.5" />
      <path d="M14 4H20V10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 4L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PercentageResizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="13" height="17" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="14" r="1.2" fill="currentColor" />
      <path d="M6 18L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="17" r="1.2" fill="currentColor" />
      <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3L13 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ResizerTool() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [mode, setMode] = useState<'pixels' | 'percentage'>('pixels');
  const [width, setWidth] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [maintainRatio, setMaintainRatio] = useState<boolean>(true);
  const [doNotEnlarge, setDoNotEnlarge] = useState<boolean>(false);
  const [scalePercent, setScalePercent] = useState<number>(50);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  // Helper to load dimensions for an array of files
  const loadFiles = async (filesToAdd: File[]) => {
    if (!filesToAdd || filesToAdd.length === 0) return;

    const newItems: ImageItem[] = await Promise.all(
      filesToAdd.map(async (file) => {
        const url = URL.createObjectURL(file);
        const dims = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: 800, height: 600 });
          img.src = url;
        });
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl: url,
          originalWidth: dims.width,
          originalHeight: dims.height,
        };
      })
    );

    setImages((prev) => {
      const updated = [...prev, ...newItems];
      if (prev.length === 0 && updated.length > 0) {
        // Set initial width/height from the primary image
        setWidth(updated[0].originalWidth);
        setHeight(updated[0].originalHeight);
      }
      return updated;
    });
  };

  const primaryImage = images[0];

  const handleWidthChange = (val: number | '') => {
    setWidth(val);
    if (maintainRatio && val !== '' && primaryImage?.originalWidth > 0) {
      const calculatedH = Math.max(1, Math.round((primaryImage.originalHeight / primaryImage.originalWidth) * val));
      setHeight(calculatedH);
    }
  };

  const handleHeightChange = (val: number | '') => {
    setHeight(val);
    if (maintainRatio && val !== '' && primaryImage?.originalHeight > 0) {
      const calculatedW = Math.max(1, Math.round((primaryImage.originalWidth / primaryImage.originalHeight) * val));
      setWidth(calculatedW);
    }
  };

  const handlePreset = (pWidth: number, pHeight: number) => {
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
    // Revoke object URLs to prevent memory leaks
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setResults(null);
    setError(null);
    setWidth('');
    setHeight('');
    setProcessProgress(null);
  };

  // Calculate preview target dimensions for a specific image item
  const getTargetDimensions = (item: ImageItem) => {
    if (mode === 'percentage') {
      const factor = (scalePercent || 50) / 100;
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
      // Scale proportionally based on item's own aspect ratio
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

  const handleProcess = async () => {
    if (images.length === 0) return;
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

        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('width', dims.width.toString());
        formData.append('height', dims.height.toString());
        formData.append('maintainAspectRatio', maintainRatio ? 'true' : 'false');
        formData.append('withoutEnlargement', doNotEnlarge ? 'true' : 'false');
        if (mode === 'percentage') {
          formData.append('scalePercent', scalePercent.toString());
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

  return (
    <div className="w-full space-y-6">
      {/* Hidden file input for adding more images */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
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
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple={true}
          maxFiles={20}
          onFilesSelected={loadFiles}
          title="Drop images here to resize"
          subtitle="Resize photos by exact pixels or percentage online"
        />
      )}

      {/* Active Workspace when images are loaded */}
      {images.length > 0 && !results && (
        <div className="flex flex-col lg:flex-row items-start gap-6 animate-in fade-in duration-150">
          {/* LEFT: Image Gallery / Workspace */}
          <div className="flex-1 w-full min-w-0 space-y-4">
            {/* Top Workspace Bar */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-base-200/60 backdrop-blur-md border border-base-300/80 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="badge badge-primary font-bold px-3 py-1 text-xs shadow-xs">
                  {images.length} {images.length === 1 ? 'Image' : 'Images'}
                </span>
                <span className="text-xs text-base-content/60 hidden sm:inline">
                  Ready to resize
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => hiddenFileInputRef.current?.click()}
                  className="btn btn-sm btn-ghost gap-1.5 text-xs text-primary font-semibold hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add More</span>
                </button>
                <div className="w-px h-4 bg-base-300"></div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-sm btn-ghost text-xs text-base-content/60 hover:text-error gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4.5 relative">
              {images.map((item, idx) => {
                const dims = getTargetDimensions(item);
                return (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl border border-base-300 bg-base-100 hover:border-primary/50 hover:shadow-md transition-all p-3.5 flex flex-col justify-between"
                  >
                    {/* Delete button on card */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(item.id)}
                      className="absolute top-2.5 right-2.5 btn btn-circle btn-xs btn-ghost text-base-content/50 hover:text-error hover:bg-error/10 z-10 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Image Thumbnail */}
                    <div className="w-full aspect-[4/3] bg-base-200/40 rounded-xl overflow-hidden flex items-center justify-center p-2 mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    </div>

                    {/* Info & Dimension Badges */}
                    <div className="space-y-2">
                      <p
                        className="text-xs font-bold text-base-content truncate px-0.5"
                        title={item.file.name}
                      >
                        {item.file.name}
                      </p>

                      {/* Dimension Arrow Badge matching reference screenshot */}
                      <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-base-200/80">
                        <span className="px-2 py-0.5 rounded-md bg-base-200 text-base-content/70 text-[11px] font-mono font-medium">
                          {item.originalWidth} × {item.originalHeight}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-base-content/40 shrink-0" />
                        <span className="px-2 py-0.5 rounded-md bg-primary text-primary-content text-[11px] font-mono font-bold shadow-xs">
                          {dims.width} × {dims.height}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add More Images Card in Grid */}
              <button
                type="button"
                onClick={() => hiddenFileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-base-300 hover:border-primary/60 bg-base-200/20 hover:bg-base-200/50 transition-all flex flex-col items-center justify-center p-6 min-h-[200px] gap-2.5 text-base-content/60 hover:text-primary group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-base-100 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center border border-base-300 transition-colors shadow-xs">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold">Add more images</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Resize Options Sidebar */}
          <div className="w-full lg:w-80 xl:w-96 rounded-3xl bg-base-100 border border-base-300/80 p-5 sm:p-6 shadow-xl space-y-5 shrink-0 lg:sticky lg:top-20">
            {/* Sidebar Title */}
            <h2 className="text-xl sm:text-2xl font-black text-base-content tracking-tight">
              Resize options
            </h2>

            {/* Mode Selector Cards (By pixels vs By percentage) */}
            <div className="grid grid-cols-2 gap-3">
              {/* By pixels */}
              <button
                type="button"
                onClick={() => setMode('pixels')}
                className={`relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  mode === 'pixels'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-base-300 bg-base-100 hover:border-base-content/20 text-base-content/70'
                }`}
              >
                {mode === 'pixels' && (
                  <div className="absolute top-2.5 left-2.5 w-4 h-4 rounded-full bg-success text-success-content flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
                <PixelGridResizeIcon className="w-8 h-8 mb-2" />
                <span className="font-extrabold text-xs sm:text-sm">By pixels</span>
              </button>

              {/* By percentage */}
              <button
                type="button"
                onClick={() => setMode('percentage')}
                className={`relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  mode === 'percentage'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-base-300 bg-base-100 hover:border-base-content/20 text-base-content/70'
                }`}
              >
                {mode === 'percentage' && (
                  <div className="absolute top-2.5 left-2.5 w-4 h-4 rounded-full bg-success text-success-content flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
                <PercentageResizeIcon className="w-8 h-8 mb-2" />
                <span className="font-extrabold text-xs sm:text-sm">By percentage</span>
              </button>
            </div>

            {/* Context Subtitle */}
            <p className="text-xs sm:text-sm text-base-content/70">
              {mode === 'pixels' ? (
                <>
                  Resize all images to an <strong className="text-base-content font-bold">exact size</strong> of:
                </>
              ) : (
                <>
                  Resize all images to a <strong className="text-base-content font-bold">percentage</strong> of original:
                </>
              )}
            </p>

            {/* BY PIXELS CONTROLS */}
            {mode === 'pixels' && (
              <div className="space-y-3.5 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-base-content">Width (px):</label>
                  <div className="flex items-center border border-base-300 rounded-xl bg-base-100 overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs">
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={width}
                      onChange={(e) =>
                        handleWidthChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                      }
                      placeholder="Width"
                      className="input input-sm border-none focus:outline-hidden font-bold text-center w-28 sm:w-32 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-base-content">Height (px):</label>
                  <div className="flex items-center border border-base-300 rounded-xl bg-base-100 overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs">
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={height}
                      onChange={(e) =>
                        handleHeightChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                      }
                      placeholder="Height"
                      className="input input-sm border-none focus:outline-hidden font-bold text-center w-28 sm:w-32 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BY PERCENTAGE CONTROLS */}
            {mode === 'percentage' && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {[25, 50, 75, 100, 150, 200].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setScalePercent(pct)}
                      className={`btn btn-xs rounded-xl flex-1 font-bold ${
                        scalePercent === pct
                          ? 'btn-primary text-primary-content shadow-xs'
                          : 'btn-ghost bg-base-200/60 border border-base-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="text-sm font-bold text-base-content">Scale (%):</label>
                  <div className="flex items-center border border-base-300 rounded-xl bg-base-100 overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={scalePercent}
                      onChange={(e) =>
                        setScalePercent(Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                      className="input input-sm border-none focus:outline-hidden font-bold text-center w-28 sm:w-32 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CHECKBOXES matching reference screenshot */}
            <div className="space-y-2.5 pt-2 border-t border-base-200">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-base-content select-none">
                <input
                  type="checkbox"
                  checked={maintainRatio}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setMaintainRatio(nextVal);
                    if (nextVal && width !== '' && primaryImage?.originalWidth) {
                      const calcH = Math.max(
                        1,
                        Math.round(
                          (primaryImage.originalHeight / primaryImage.originalWidth) * Number(width)
                        )
                      );
                      setHeight(calcH);
                    }
                  }}
                  className="checkbox checkbox-sm checkbox-primary rounded"
                />
                <span>Maintain aspect ratio</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-base-content/80 select-none">
                <input
                  type="checkbox"
                  checked={doNotEnlarge}
                  onChange={(e) => setDoNotEnlarge(e.target.checked)}
                  className="checkbox checkbox-sm checkbox-primary rounded"
                />
                <span>Do not enlarge if smaller</span>
              </label>
            </div>

            {/* Collapsible Social Presets */}
            <details className="collapse collapse-arrow bg-base-200/50 rounded-2xl border border-base-300/80">
              <summary className="collapse-title text-xs font-bold text-base-content/80 py-2.5 min-h-0">
                Popular Social Presets
              </summary>
              <div className="collapse-content space-y-1.5 pt-1">
                {SOCIAL_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePreset(preset.width, preset.height)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-base-100 flex items-center justify-between text-base-content/80 hover:text-primary transition-colors"
                  >
                    <span className="font-medium">{preset.name}</span>
                    <span className="font-mono text-[11px] opacity-60">
                      {preset.width}×{preset.height}
                    </span>
                  </button>
                ))}
              </div>
            </details>

            {/* Error Message */}
            {error && (
              <div className="alert alert-error text-xs rounded-xl py-2.5 shadow-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Big Action CTA Button */}
            <button
              type="button"
              onClick={handleProcess}
              disabled={isProcessing || images.length === 0}
              className="btn btn-primary btn-lg rounded-2xl w-full font-black text-base shadow-xl shadow-primary/25 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 uppercase tracking-wide cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>
                    Resizing{' '}
                    {processProgress
                      ? `${processProgress.current}/${processProgress.total}...`
                      : '...'}
                  </span>
                </>
              ) : (
                <>
                  <span>Resize {images.length > 1 ? 'IMAGES' : 'IMAGE'}</span>
                  <ArrowRightCircle className="w-5 h-5 shrink-0" />
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
              />
            </div>
          )}

          {/* Multiple Images Results */}
          {results.length > 1 && (
            <div className="space-y-6">
              {/* Batch Summary Header */}
              <div className="p-5 sm:p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center shadow-xs">
                    <Check className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-base-content">
                      {results.length} Images Successfully Resized!
                    </h3>
                    <p className="text-xs text-base-content/60">
                      Total original:{' '}
                      {formatBytes(results.reduce((acc, r) => acc + r.originalSize, 0))} → New:{' '}
                      {formatBytes(results.reduce((acc, r) => acc + r.compressedSize, 0))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={isZipping}
                    className="btn btn-primary rounded-xl font-bold gap-2 shadow-lg shadow-primary/20 flex-1 sm:flex-none"
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
                    <RotateCcw className="w-4 h-4" />
                    <span>Resize More</span>
                  </button>
                </div>
              </div>

              {/* Grid of Results */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((r, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="w-full aspect-[4/3] bg-base-200/50 rounded-xl overflow-hidden flex items-center justify-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.dataUrl}
                        alt={r.originalName}
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-base-content truncate" title={r.originalName}>
                        {r.originalName}
                      </p>
                      <div className="flex items-center justify-between text-xs text-base-content/60">
                        <span>
                          {r.width} × {r.height} px
                        </span>
                        <span className="font-semibold text-primary">{formatBytes(r.compressedSize)}</span>
                      </div>
                    </div>

                    <a
                      href={r.dataUrl}
                      download={`resized_${r.width}x${r.height}_${r.originalName}`}
                      className="btn btn-sm btn-outline btn-primary rounded-xl w-full gap-2 font-bold"
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
