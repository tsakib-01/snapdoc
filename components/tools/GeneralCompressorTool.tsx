'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sliders, Sparkles, AlertCircle } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ComparisonViewer from '@/components/ui/ComparisonViewer';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

export default function GeneralCompressorTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState<number>(75);
  const [targetFormat, setTargetFormat] = useState<'original' | 'jpeg' | 'png' | 'webp'>('original');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setOriginalPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalPreviewUrl(null);
    }
  }, [files]);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('quality', quality.toString());
      formData.append('format', targetFormat);

      const res = await fetch('/api/compress-general', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Compression failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while compressing image.');
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
          title="Drop image to optimize"
          subtitle="Supports JPG, PNG, and WebP formats"
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

          {/* Quality Slider Controls */}
          <div className="p-5 rounded-2xl bg-base-200/30 border border-base-300 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-base-content/80 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Compression Quality Level
              </label>
              <span className="badge badge-primary font-bold text-sm px-3 py-2">
                {quality}%
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="95"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value, 10))}
              className="range range-primary w-full range-sm"
            />

            <div className="flex justify-between text-[11px] text-base-content/50 font-medium">
              <span>Max Compression (Smallest file)</span>
              <span>Balanced (Recommended)</span>
              <span>High Fidelity</span>
            </div>

            {/* Output Format Picker */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-base-200/60">
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
                      targetFormat === fmt ? 'btn-primary text-white font-bold' : 'btn-ghost'
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

          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing}
            className="btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/20 gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Optimizing Image...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Compress Image ({quality}% Quality)
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
            filename={`compressed_${result.originalName}`}
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
