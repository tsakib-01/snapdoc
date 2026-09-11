'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRight, Sparkles, Check, AlertCircle } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ComparisonViewer from '@/components/ui/ComparisonViewer';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

interface TargetCompressorToolProps {
  defaultTargetKb?: number;
  fixedTarget?: boolean;
}

const PRESET_SIZES = [
  { label: '10 KB', value: 10, note: 'Govt exams / signatures' },
  { label: '20 KB', value: 20, note: 'ID portals / SSC' },
  { label: '50 KB', value: 50, note: 'Visa & Passport photos' },
  { label: '100 KB', value: 100, note: 'Web & Email attachments' },
  { label: '200 KB', value: 200, note: 'Document uploads' },
  { label: '500 KB', value: 500, note: 'High resolution web' },
  { label: '1 MB', value: 1024, note: '1024 KB standard' },
];

export default function TargetCompressorTool({
  defaultTargetKb = 50,
  fixedTarget = false,
}: TargetCompressorToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [targetKb, setTargetKb] = useState<number>(defaultTargetKb);
  const [customKb, setCustomKb] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
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
      const activeKb = isCustom ? (parseFloat(customKb) || 50) : targetKb;
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('targetKb', activeKb.toString());
      formData.append('format', 'original');

      const res = await fetch('/api/compress-target', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Compression failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong during compression.');
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
      {/* 1. Upload state */}
      {files.length === 0 && (
        <UploadZone
          accept="image/jpeg,image/jpg,image/png,image/webp"
          files={files}
          onFilesSelected={setFiles}
          title="Drop your image to compress"
          subtitle="Supports JPG, PNG, and WebP (Up to 50MB)"
        />
      )}

      {/* 2. File uploaded & Configuration Panel */}
      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* File summary bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300 gap-3">
            <div className="flex items-center gap-3">
              {originalPreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={originalPreviewUrl}
                  alt="Original thumb"
                  className="w-12 h-12 object-cover rounded-xl border border-base-300 shadow-sm"
                />
              )}
              <div>
                <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs sm:max-w-md">
                  {files[0].name}
                </p>
                <p className="text-xs text-base-content/60">
                  Original Size: <strong className="text-base-content">{formatBytes(files[0].size)}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="btn btn-ghost btn-xs text-base-content/60 hover:text-error"
            >
              Change File
            </button>
          </div>

          {/* Target Size Selectors */}
          {!fixedTarget && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Select Desired Target File Size
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_SIZES.map((preset) => {
                  const isSelected = !isCustom && targetKb === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setTargetKb(preset.value);
                        setIsCustom(false);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-base-300 bg-base-100 hover:border-primary/40 hover:bg-base-200/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-base-content">
                          {preset.label}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <span className="text-[10px] text-base-content/50 block mt-0.5 line-clamp-1">
                        {preset.note}
                      </span>
                    </button>
                  );
                })}

                {/* Custom Target size tile */}
                <button
                  type="button"
                  onClick={() => setIsCustom(true)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isCustom
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                      : 'border-base-300 bg-base-100 hover:border-primary/40 hover:bg-base-200/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-base-content">Custom Size</span>
                    {isCustom && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <span className="text-[10px] text-base-content/50 block mt-0.5">
                    Enter custom KB
                  </span>
                </button>
              </div>

              {/* Custom input box */}
              {isCustom && (
                <div className="p-4 rounded-2xl bg-base-200/40 border border-base-300 flex items-center gap-3 animate-in fade-in duration-100">
                  <span className="text-xs font-semibold text-base-content/70">
                    Target KB:
                  </span>
                  <input
                    type="number"
                    min="5"
                    max="50000"
                    value={customKb}
                    onChange={(e) => setCustomKb(e.target.value)}
                    placeholder="e.g. 75"
                    className="input input-sm input-bordered rounded-xl w-32 font-bold"
                  />
                  <span className="text-xs text-base-content/50">
                    KB (e.g. 30 KB, 75 KB, 350 KB)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          {error && (
            <div className="alert alert-error text-xs rounded-2xl py-3 shadow-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleProcess}
              disabled={isProcessing}
              className="btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/25 gap-2 hover:scale-[1.01] transition-transform"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Compressing with Precision Engine...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Compress to {isCustom ? `${customKb || '50'} KB` : `${targetKb} KB`}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. Result View */}
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
            filename={`compressed_${result.originalName.replace(/\.[^/.]+$/, '')}.jpg`}
            dataUrl={result.dataUrl}
            format="JPG"
            dimensions={{ width: result.width, height: result.height }}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
