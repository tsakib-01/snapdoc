'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ComparisonViewer from '@/components/ui/ComparisonViewer';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

// Optimal high-efficiency compression quality giving maximum file reduction with clear visuals
const MAX_COMPRESSION_QUALITY = 65;

export default function GeneralCompressorTool() {
  const [files, setFiles] = useState<File[]>([]);
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
      formData.append('quality', MAX_COMPRESSION_QUALITY.toString());
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

          {/* Maximum Output Compression Mode */}
          <div className="p-5 rounded-2xl bg-base-200/30 border border-base-300 space-y-4">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-base-content">Maximum Compression</h4>
                  <p className="text-xs text-base-content/60">
                    Automatically applies the highest possible file size reduction while maintaining clean visual clarity.
                  </p>
                </div>
              </div>
              <span className="badge badge-success text-success-content font-bold text-xs px-2.5 py-1 shrink-0 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auto-Optimized</span>
              </span>
            </div>

            {/* Output Format Picker */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-base-200/60">
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
                      targetFormat === fmt ? 'btn-primary text-primary-content font-bold' : 'btn-ghost'
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
            className="btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-primary-content font-bold shadow-xl shadow-primary/20 gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Compressing Image...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Compress Image</span>
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
