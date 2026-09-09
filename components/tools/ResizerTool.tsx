'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Maximize2, Lock, Unlock, Sparkles, AlertCircle } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ComparisonViewer from '@/components/ui/ComparisonViewer';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

const SOCIAL_PRESETS = [
  { name: 'Instagram Square', width: 1080, height: 1080 },
  { name: 'Instagram Story', width: 1080, height: 1920 },
  { name: 'YouTube Thumbnail', width: 1280, height: 720 },
  { name: 'Twitter / X Header', width: 1500, height: 500 },
  { name: 'Facebook Cover', width: 820, height: 312 },
  { name: 'Web Banner 728×90', width: 728, height: 90 },
];

export default function ResizerTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [origDimensions, setOrigDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [width, setWidth] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [maintainRatio, setMaintainRatio] = useState<boolean>(true);
  const [scalePercent, setScalePercent] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setOriginalPreviewUrl(url);

      // Extract image intrinsic dimensions
      const img = new Image();
      img.onload = () => {
        setOrigDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
      };
      img.src = url;

      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalPreviewUrl(null);
      setOrigDimensions({ width: 0, height: 0 });
    }
  }, [files]);

  const handleWidthChange = (val: number | '') => {
    setWidth(val);
    setScalePercent(null);
    if (maintainRatio && val !== '' && origDimensions.width > 0) {
      const calculatedH = Math.max(1, Math.round((origDimensions.height / origDimensions.width) * val));
      setHeight(calculatedH);
    }
  };

  const handleHeightChange = (val: number | '') => {
    setHeight(val);
    setScalePercent(null);
    if (maintainRatio && val !== '' && origDimensions.height > 0) {
      const calculatedW = Math.max(1, Math.round((origDimensions.width / origDimensions.height) * val));
      setWidth(calculatedW);
    }
  };

  const handlePreset = (pWidth: number, pHeight: number) => {
    setMaintainRatio(false);
    setWidth(pWidth);
    setHeight(pHeight);
    setScalePercent(null);
  };

  const handleScalePercent = (pct: number) => {
    setScalePercent(pct);
    if (origDimensions.width > 0) {
      setWidth(Math.max(1, Math.round((origDimensions.width * pct) / 100)));
      setHeight(Math.max(1, Math.round((origDimensions.height * pct) / 100)));
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      if (width) formData.append('width', width.toString());
      if (height) formData.append('height', height.toString());
      formData.append('maintainAspectRatio', maintainRatio ? 'true' : 'false');

      const res = await fetch('/api/resize-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resize image.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error resizing image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="w-full space-y-6">
      {files.length === 0 && (
        <UploadZone
          accept="image/jpeg,image/jpg,image/png,image/webp"
          files={files}
          onFilesSelected={setFiles}
          title="Drop image to resize"
          subtitle="Change pixel dimensions or scale percentage"
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header Info */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300">
            <div className="flex items-center gap-3">
              {originalPreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={originalPreviewUrl} alt="Thumb" className="w-12 h-12 object-cover rounded-xl border border-base-300" />
              )}
              <div>
                <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs">{files[0].name}</p>
                <p className="text-xs text-base-content/60">
                  Dimensions: <strong>{origDimensions.width} × {origDimensions.height} px</strong> | Size: {formatBytes(files[0].size)}
                </p>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-xs text-base-content/60 hover:text-error">
              Change
            </button>
          </div>

          {/* Resize Controls */}
          <div className="p-5 rounded-2xl bg-base-200/40 border border-base-300 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                Custom Dimensions
              </span>
              <button
                type="button"
                onClick={() => setMaintainRatio(!maintainRatio)}
                className={`btn btn-xs rounded-lg gap-1.5 ${
                  maintainRatio ? 'btn-primary text-white' : 'btn-ghost text-base-content/60'
                }`}
              >
                {maintainRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{maintainRatio ? 'Lock Aspect Ratio' : 'Free Aspect Ratio'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-base-content/70 mb-1 block">Width (px)</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={width}
                  onChange={(e) => handleWidthChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="Width"
                  className="input input-bordered w-full rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-base-content/70 mb-1 block">Height (px)</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={height}
                  onChange={(e) => handleHeightChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="Height"
                  className="input input-bordered w-full rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Scale percentage pills */}
            <div className="space-y-2 pt-2 border-t border-base-300">
              <span className="text-xs font-semibold text-base-content/70 block">Scale by Percentage:</span>
              <div className="flex flex-wrap gap-2">
                {[25, 50, 75, 100, 150, 200].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleScalePercent(pct)}
                    className={`btn btn-xs rounded-xl ${
                      scalePercent === pct ? 'btn-primary text-white font-bold' : 'btn-ghost bg-base-100 border border-base-300'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Social media presets */}
            <div className="space-y-2 pt-2 border-t border-base-300">
              <span className="text-xs font-semibold text-base-content/70 block">Popular Social Presets:</span>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePreset(preset.width, preset.height)}
                    className="btn btn-xs rounded-xl btn-ghost bg-base-100 border border-base-300 text-base-content/80 hover:text-primary"
                  >
                    {preset.name} ({preset.width}×{preset.height})
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

          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing}
            className="btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/20 gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Resizing Image...
              </>
            ) : (
              <>
                <Maximize2 className="w-5 h-5" />
                Resize to {width || 0} × {height || 0} px
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
            originalDimensions={{ width: result.originalWidth, height: result.originalHeight }}
            processedDimensions={{ width: result.width, height: result.height }}
          />

          <ResultCard
            originalSize={result.originalSize}
            newSize={result.compressedSize}
            reductionPercentage={result.reductionPercentage}
            filename={`resized_${result.width}x${result.height}_${result.originalName}`}
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
