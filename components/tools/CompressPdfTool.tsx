'use client';

import React, { useState } from 'react';
import { Loader2, Minimize2, Sparkles, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

export default function CompressPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const res = await fetch('/api/compress-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Compression failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while compressing PDF.');
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
          accept="application/pdf"
          files={files}
          onFilesSelected={setFiles}
          title="Drop PDF file to optimize and compress"
          subtitle="Reduces PDF object stream size while preserving crisp text vectors"
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300">
            <div>
              <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs sm:max-w-md">{files[0].name}</p>
              <p className="text-xs text-base-content/60">Current Size: <strong>{formatBytes(files[0].size)}</strong></p>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-xs text-base-content/60 hover:text-error">
              Change
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-base-200/40 border border-base-300 space-y-2 text-xs text-base-content/75">
            <h4 className="font-bold text-base-content uppercase tracking-wider">How PDF Compression Works:</h4>
            <p>
              Our PDF optimizer applies object stream compression, cleans duplicate fonts, and reconstructs cross-reference tables in memory. Text vectors and font quality remain sharp and unaltered.
            </p>
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
            className="btn btn-primary btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/20 gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Optimizing PDF Structure...
              </>
            ) : (
              <>
                <Minimize2 className="w-5 h-5" />
                Compress PDF Document
              </>
            )}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-base-200/50 border border-base-300 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base text-base-content">PDF Optimization Complete</h4>
              <p className="text-xs text-base-content/60 mt-0.5">
                New Size: {formatBytes(result.compressedSize)} ({result.reductionPercentage}% smaller)
              </p>
            </div>
          </div>

          <ResultCard
            originalSize={result.originalSize}
            newSize={result.compressedSize}
            reductionPercentage={result.reductionPercentage}
            filename={result.filename}
            dataUrl={result.dataUrl}
            format="PDF"
            extraInfo={`${result.pageCount} Pages`}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
