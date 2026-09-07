'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Crop, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

const RATIO_PRESETS = [
  { name: '1:1 Square', ratio: 1 / 1 },
  { name: '16:9 Widescreen', ratio: 16 / 9 },
  { name: '4:3 Standard', ratio: 4 / 3 },
  { name: '9:16 Story / Reel', ratio: 9 / 16 },
  { name: '3:2 Classic Photo', ratio: 3 / 2 },
  { name: 'Freeform', ratio: null },
];

export default function CropperTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [origDimensions, setOrigDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [cropBox, setCropBox] = useState({ left: 0, top: 0, width: 100, height: 100 });
  const [selectedPreset, setSelectedPreset] = useState<string>('Freeform');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setOriginalPreviewUrl(url);

      const img = new Image();
      img.onload = () => {
        setOrigDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        // Initialize default crop to centered 80% box
        const w = Math.round(img.naturalWidth * 0.8);
        const h = Math.round(img.naturalHeight * 0.8);
        const l = Math.round((img.naturalWidth - w) / 2);
        const t = Math.round((img.naturalHeight - h) / 2);
        setCropBox({ left: l, top: t, width: w, height: h });
      };
      img.src = url;

      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalPreviewUrl(null);
      setOrigDimensions({ width: 0, height: 0 });
    }
  }, [files]);

  const handleRatioSelect = (presetName: string, ratio: number | null) => {
    setSelectedPreset(presetName);
    if (!ratio || origDimensions.width === 0) return;

    let newW = origDimensions.width * 0.8;
    let newH = newW / ratio;

    if (newH > origDimensions.height) {
      newH = origDimensions.height * 0.8;
      newW = newH * ratio;
    }

    newW = Math.round(newW);
    newH = Math.round(newH);
    const newL = Math.round((origDimensions.width - newW) / 2);
    const newT = Math.round((origDimensions.height - newH) / 2);

    setCropBox({ left: newL, top: newT, width: newW, height: newH });
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append(
        'crop',
        JSON.stringify({
          left: Math.round(cropBox.left),
          top: Math.round(cropBox.top),
          width: Math.round(cropBox.width),
          height: Math.round(cropBox.height),
        })
      );

      const res = await fetch('/api/transform-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Crop failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while cropping.');
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
          subtitle="Supports 1:1, 16:9, custom dimensions, and freeform crop"
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300">
            <div>
              <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs">{files[0].name}</p>
              <p className="text-xs text-base-content/60">
                Original Dimensions: <strong>{origDimensions.width} × {origDimensions.height} px</strong>
              </p>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-xs text-base-content/60 hover:text-error">
              Change
            </button>
          </div>

          {/* Preset Ratio Pills */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 block">
              Aspect Ratio Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              {RATIO_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleRatioSelect(p.name, p.ratio)}
                  className={`btn btn-xs rounded-xl ${
                    selectedPreset === p.name ? 'btn-primary text-white font-bold' : 'btn-ghost bg-base-200 border border-base-300'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Crop dimension inputs */}
          <div className="p-4 rounded-2xl bg-base-200/40 border border-base-300 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-base-content/70 block mb-1">Left (X)</label>
              <input
                type="number"
                min="0"
                max={origDimensions.width}
                value={cropBox.left}
                onChange={(e) => setCropBox({ ...cropBox, left: parseInt(e.target.value, 10) || 0 })}
                className="input input-sm input-bordered w-full rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-base-content/70 block mb-1">Top (Y)</label>
              <input
                type="number"
                min="0"
                max={origDimensions.height}
                value={cropBox.top}
                onChange={(e) => setCropBox({ ...cropBox, top: parseInt(e.target.value, 10) || 0 })}
                className="input input-sm input-bordered w-full rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-base-content/70 block mb-1">Crop Width</label>
              <input
                type="number"
                min="1"
                max={origDimensions.width}
                value={cropBox.width}
                onChange={(e) => setCropBox({ ...cropBox, width: parseInt(e.target.value, 10) || 1 })}
                className="input input-sm input-bordered w-full rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-base-content/70 block mb-1">Crop Height</label>
              <input
                type="number"
                min="1"
                max={origDimensions.height}
                value={cropBox.height}
                onChange={(e) => setCropBox({ ...cropBox, height: parseInt(e.target.value, 10) || 1 })}
                className="input input-sm input-bordered w-full rounded-xl font-mono font-bold"
              />
            </div>
          </div>

          {/* Interactive visual viewport */}
          {originalPreviewUrl && (
            <div className="p-4 rounded-2xl bg-base-100 border border-base-300 flex flex-col items-center justify-center bg-transparency-grid">
              <div className="relative max-h-[360px] inline-block border border-base-300 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalPreviewUrl}
                  alt="Crop preview source"
                  className="max-h-[360px] object-contain opacity-90"
                />
              </div>
              <p className="text-xs text-base-content/60 mt-2">
                Crop Area: {cropBox.width} × {cropBox.height} px at ({cropBox.left}, {cropBox.top})
              </p>
            </div>
          )}

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
            className="btn btn-primary btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/20 gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Cropping Image...
              </>
            ) : (
              <>
                <Crop className="w-5 h-5" />
                Crop Image ({cropBox.width} × {cropBox.height} px)
              </>
            )}
          </button>
        </div>
      )}

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
