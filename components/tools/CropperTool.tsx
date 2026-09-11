'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Crop, CheckCircle2, RotateCcw, Sliders, Image as ImageIcon, AlertCircle } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

export default function CropperTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [origDimensions, setOrigDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);

  // Margin percentages (0% - 40%)
  const [topMargin, setTopMargin] = useState<number>(5);
  const [bottomMargin, setBottomMargin] = useState<number>(5);
  const [leftMargin, setLeftMargin] = useState<number>(5);
  const [rightMargin, setRightMargin] = useState<number>(5);
  const [activePreset, setActivePreset] = useState<string>('light');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setOriginalPreviewUrl(url);

      const img = new Image();
      img.onload = () => {
        setOrigDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setTopMargin(5);
        setBottomMargin(5);
        setLeftMargin(5);
        setRightMargin(5);
      };
      img.src = url;

      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalPreviewUrl(null);
      setOrigDimensions({ width: 0, height: 0 });
    }
  }, [files]);

  // Apply Presets
  const handleApplyPreset = (preset: 'light' | 'standard' | 'square' | 'wide' | 'header-footer') => {
    setActivePreset(preset);
    if (preset === 'light') {
      setTopMargin(4);
      setBottomMargin(4);
      setLeftMargin(4);
      setRightMargin(4);
    } else if (preset === 'standard') {
      setTopMargin(10);
      setBottomMargin(10);
      setLeftMargin(10);
      setRightMargin(10);
    } else if (preset === 'header-footer') {
      setTopMargin(15);
      setBottomMargin(15);
      setLeftMargin(3);
      setRightMargin(3);
    } else if (preset === 'square') {
      if (origDimensions.width > 0 && origDimensions.height > 0) {
        if (origDimensions.width > origDimensions.height) {
          const diffPct = ((origDimensions.width - origDimensions.height) / origDimensions.width) * 100;
          const side = Math.round(diffPct / 2);
          setLeftMargin(side);
          setRightMargin(side);
          setTopMargin(0);
          setBottomMargin(0);
        } else {
          const diffPct = ((origDimensions.height - origDimensions.width) / origDimensions.height) * 100;
          const side = Math.round(diffPct / 2);
          setTopMargin(side);
          setBottomMargin(side);
          setLeftMargin(0);
          setRightMargin(0);
        }
      }
    } else if (preset === 'wide') {
      // 16:9 Aspect Ratio
      if (origDimensions.width > 0 && origDimensions.height > 0) {
        const targetRatio = 16 / 9;
        const currentRatio = origDimensions.width / origDimensions.height;
        if (currentRatio > targetRatio) {
          const newW = origDimensions.height * targetRatio;
          const side = Math.round((((origDimensions.width - newW) / origDimensions.width) * 100) / 2);
          setLeftMargin(side);
          setRightMargin(side);
          setTopMargin(0);
          setBottomMargin(0);
        } else {
          const newH = origDimensions.width / targetRatio;
          const side = Math.round((((origDimensions.height - newH) / origDimensions.height) * 100) / 2);
          setTopMargin(side);
          setBottomMargin(side);
          setLeftMargin(0);
          setRightMargin(0);
        }
      }
    }
  };

  // Calculate actual pixel coordinates
  const cropPixels = {
    left: Math.round((leftMargin / 100) * origDimensions.width),
    top: Math.round((topMargin / 100) * origDimensions.height),
    width: Math.max(1, Math.round(origDimensions.width * (1 - (leftMargin + rightMargin) / 100))),
    height: Math.max(1, Math.round(origDimensions.height * (1 - (topMargin + bottomMargin) / 100))),
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('crop', JSON.stringify(cropPixels));

      const res = await fetch('/api/transform-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server crop failed, using client-side engine.');
      }

      setResult(data);
    } catch (err: any) {
      // Client-side fallback using Canvas
      try {
        if (!originalPreviewUrl) throw new Error('Preview not ready');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = originalPreviewUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = cropPixels.width;
        canvas.height = cropPixels.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        ctx.drawImage(
          img,
          cropPixels.left,
          cropPixels.top,
          cropPixels.width,
          cropPixels.height,
          0,
          0,
          cropPixels.width,
          cropPixels.height
        );

        const mime = files[0].type || 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, 0.92);
        const approxSize = Math.round((dataUrl.length * 3) / 4);

        setResult({
          success: true,
          originalName: files[0].name,
          originalSize: files[0].size,
          compressedSize: approxSize,
          width: cropPixels.width,
          height: cropPixels.height,
          format: mime.split('/')[1] || 'jpeg',
          dataUrl,
        });
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || 'Error occurred while cropping image.');
      }
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
          title="Upload image to crop"
          subtitle="Supports 1:1, 16:9, margin cutouts, and custom pixel-perfect crop"
        />
      )}

      {files.length > 0 && !result && (
        <div className="p-4 sm:p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-6 animate-in fade-in duration-150">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div>
              <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs sm:max-w-md">
                {files[0].name}
              </p>
              <p className="text-xs text-base-content/60">
                Original Size: <strong>{origDimensions.width} × {origDimensions.height} px</strong> ({formatBytes(files[0].size)})
              </p>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-xs sm:btn-sm text-base-content/60 hover:text-error">
              Change Image
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Interactive Visual Viewport with Shaded Cutouts */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-base-200/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-base-300">
              <div className="flex items-center justify-between w-full mb-3 text-xs text-base-content/70">
                <span className="font-semibold flex items-center gap-1.5">
                  <Crop className="w-4 h-4 text-primary" />
                  Live Crop Preview
                </span>
                <span className="text-[11px] text-error font-medium">
                  Red shaded areas will be trimmed
                </span>
              </div>

              {originalPreviewUrl ? (
                <div className="relative max-w-full max-h-[420px] rounded-xl overflow-hidden border border-base-300 shadow-md inline-block select-none bg-white">
                  {/* Base Image */}
                  <img
                    src={originalPreviewUrl}
                    alt="Original Crop Source"
                    className="max-h-[400px] w-auto max-w-full object-contain block"
                  />

                  {/* Top Shaded Cutout */}
                  <div
                    style={{
                      top: 0,
                      left: 0,
                      right: 0,
                      height: `${topMargin}%`,
                    }}
                    className="absolute bg-red-500/30 backdrop-blur-[0.5px] border-b border-red-500/60 pointer-events-none transition-all duration-75"
                  />

                  {/* Bottom Shaded Cutout */}
                  <div
                    style={{
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${bottomMargin}%`,
                    }}
                    className="absolute bg-red-500/30 backdrop-blur-[0.5px] border-t border-red-500/60 pointer-events-none transition-all duration-75"
                  />

                  {/* Left Shaded Cutout */}
                  <div
                    style={{
                      top: `${topMargin}%`,
                      bottom: `${bottomMargin}%`,
                      left: 0,
                      width: `${leftMargin}%`,
                    }}
                    className="absolute bg-red-500/30 backdrop-blur-[0.5px] border-r border-red-500/60 pointer-events-none transition-all duration-75"
                  />

                  {/* Right Shaded Cutout */}
                  <div
                    style={{
                      top: `${topMargin}%`,
                      bottom: `${bottomMargin}%`,
                      right: 0,
                      width: `${rightMargin}%`,
                    }}
                    className="absolute bg-red-500/30 backdrop-blur-[0.5px] border-l border-red-500/60 pointer-events-none transition-all duration-75"
                  />

                  {/* Active Crop Box (Green dashed border around kept content) */}
                  <div
                    style={{
                      top: `${topMargin}%`,
                      bottom: `${bottomMargin}%`,
                      left: `${leftMargin}%`,
                      right: `${rightMargin}%`,
                    }}
                    className="absolute border-2 border-dashed border-emerald-500 rounded pointer-events-none shadow-sm transition-all duration-75 flex items-center justify-center"
                  >
                    <span className="bg-emerald-600/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                      Crop Area
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-64 bg-base-100 rounded-xl border border-dashed border-base-300 flex items-center justify-center text-xs text-base-content/50">
                  <ImageIcon className="w-8 h-8 opacity-40 mb-2 block" />
                  Loading image preview...
                </div>
              )}

              <p className="text-xs text-base-content/60 mt-3 font-mono">
                Remaining Area: <strong>{cropPixels.width} × {cropPixels.height} px</strong>
              </p>
            </div>

            {/* Right: Crop Controls & Sliders */}
            <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                    Quick Crop Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('light')}
                      className={`btn btn-xs sm:btn-sm rounded-xl text-xs font-semibold ${
                        activePreset === 'light' ? 'btn-primary' : 'btn-outline'
                      }`}
                    >
                      Light Trim (4%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('standard')}
                      className={`btn btn-xs sm:btn-sm rounded-xl text-xs font-semibold ${
                        activePreset === 'standard' ? 'btn-primary' : 'btn-outline'
                      }`}
                    >
                      Standard (10%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('square')}
                      className={`btn btn-xs sm:btn-sm rounded-xl text-xs font-semibold ${
                        activePreset === 'square' ? 'btn-primary' : 'btn-outline'
                      }`}
                    >
                      1:1 Square
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('wide')}
                      className={`btn btn-xs sm:btn-sm rounded-xl text-xs font-semibold ${
                        activePreset === 'wide' ? 'btn-primary' : 'btn-outline'
                      }`}
                    >
                      16:9 Widescreen
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('header-footer')}
                    className={`btn btn-xs sm:btn-sm btn-block rounded-xl text-xs font-semibold ${
                      activePreset === 'header-footer' ? 'btn-primary' : 'btn-outline'
                    }`}
                  >
                    Header & Footer Cutout
                  </button>
                </div>

                {/* Margin Sliders */}
                <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-primary" />
                    <span>Cutout Margin Sliders</span>
                  </h4>

                  {/* Top */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-base-content/70">Top Cutout</span>
                      <span className="font-bold font-mono text-primary">{topMargin}% ({cropPixels.top}px)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={topMargin}
                      onChange={(e) => {
                        setActivePreset('custom');
                        setTopMargin(parseInt(e.target.value, 10));
                      }}
                      className="range range-primary range-xs"
                    />
                  </div>

                  {/* Bottom */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-base-content/70">Bottom Cutout</span>
                      <span className="font-bold font-mono text-primary">{bottomMargin}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={bottomMargin}
                      onChange={(e) => {
                        setActivePreset('custom');
                        setBottomMargin(parseInt(e.target.value, 10));
                      }}
                      className="range range-primary range-xs"
                    />
                  </div>

                  {/* Left */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-base-content/70">Left Cutout</span>
                      <span className="font-bold font-mono text-primary">{leftMargin}% ({cropPixels.left}px)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={leftMargin}
                      onChange={(e) => {
                        setActivePreset('custom');
                        setLeftMargin(parseInt(e.target.value, 10));
                      }}
                      className="range range-primary range-xs"
                    />
                  </div>

                  {/* Right */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-base-content/70">Right Cutout</span>
                      <span className="font-bold font-mono text-primary">{rightMargin}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={rightMargin}
                      onChange={(e) => {
                        setActivePreset('custom');
                        setRightMargin(parseInt(e.target.value, 10));
                      }}
                      className="range range-primary range-xs"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="alert alert-error text-xs rounded-2xl py-3 shadow-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleProcess}
                disabled={isProcessing}
                className="btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/20 gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cropping Image...
                  </>
                ) : (
                  <>
                    <Crop className="w-5 h-5" />
                    Crop Image ({cropPixels.width} × {cropPixels.height} px)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="p-4 rounded-3xl bg-base-100 border border-base-300 flex items-center justify-center bg-transparency-grid">
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
