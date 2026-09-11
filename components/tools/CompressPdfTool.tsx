'use client';

import React, { useState } from 'react';
import { Loader2, Minimize2, AlertCircle, FileText, CheckCircle2, Sliders, Download, RotateCcw, ShieldCheck } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

export default function CompressPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<'recommended' | 'extreme' | 'lossless'>('recommended');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('Optimizing PDF Structure...');
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setResult(null);

    const file = files[0];
    const originalSize = file.size;

    try {
      setProgressText('Analyzing PDF structure...');

      // Send to server-side compression endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('level', compressionLevel);

      setProgressText('Optimizing streams and compressing PDF...');
      const res = await fetch('/api/compress-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to compress PDF.');
      }

      const isAlreadyMaxCompressed = !!data.isAlreadyMaxCompressed || (data.compressedSize >= originalSize);
      const finalSize = isAlreadyMaxCompressed ? originalSize : data.compressedSize;
      const reductionPercentage = isAlreadyMaxCompressed ? 0 : data.reductionPercentage;

      setResult({
        success: true,
        filename: data.filename || file.name.replace(/\.pdf$/i, isAlreadyMaxCompressed ? '_optimal.pdf' : '_compressed.pdf'),
        originalSize,
        compressedSize: finalSize,
        reductionPercentage,
        pageCount: data.pageCount || 1,
        dataUrl: data.dataUrl,
        isAlreadyMaxCompressed,
      });
    } catch (err: any) {
      console.error(err);
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
          subtitle="Reduces PDF file size significantly while preserving crisp text readability"
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300">
            <div>
              <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs sm:max-w-md">{files[0].name}</p>
              <p className="text-xs text-base-content/60">Original Size: <strong>{formatBytes(files[0].size)}</strong></p>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-xs text-base-content/60 hover:text-error">
              Change
            </button>
          </div>

          {/* Compression Level Selector */}
          <div className="space-y-3 p-5 rounded-2xl bg-base-200/40 border border-base-300">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              Select Compression Level
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setCompressionLevel('recommended')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  compressionLevel === 'recommended'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-base-300 bg-base-100 hover:bg-base-200/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-base-content">Recommended</span>
                  <span className="badge badge-xs badge-primary">Balanced</span>
                </div>
                <p className="text-[11px] text-base-content/60 mt-1">
                  Balanced size reduction with high visual sharpness.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCompressionLevel('extreme')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  compressionLevel === 'extreme'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-base-300 bg-base-100 hover:bg-base-200/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-base-content">Extreme</span>
                  <span className="badge badge-xs badge-secondary">Max Ratio</span>
                </div>
                <p className="text-[11px] text-base-content/60 mt-1">
                  Maximum compression for email attachments & strict upload limits.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCompressionLevel('lossless')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  compressionLevel === 'lossless'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-base-300 bg-base-100 hover:bg-base-200/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-base-content">Lossless</span>
                  <span className="badge badge-xs badge-neutral">100% Vector</span>
                </div>
                <p className="text-[11px] text-base-content/60 mt-1">
                  Cleans redundant streams and metadata without touching images.
                </p>
              </button>
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
                {progressText}
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

      {/* Maximum Compression Stage Alert Card */}
      {result && result.isAlreadyMaxCompressed && (
        <div className="w-full p-6 sm:p-8 rounded-3xl bg-base-100 border border-primary/30 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start sm:items-center gap-4 pb-4 border-b border-base-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-sm badge-success font-bold text-[10px] text-white uppercase">
                  Already Optimal
                </span>
                <span className="text-xs text-base-content/50">100% Quality Preserved</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-base-content mt-1">
                This PDF has reached its maximum compression stage
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-2 text-xs leading-relaxed text-base-content/80">
            <p>
              Your document <strong>{files[0]?.name || result.filename}</strong> is already completely optimized. It contains no redundant object streams, bloated metadata, or downsample-able layers.
            </p>
            <p className="text-base-content/60">
              Further compression without discarding text legibility or removing pages is not possible. To preserve complete document fidelity and avoid making the file larger, SnapDoc has kept your file at its optimal size of <strong>{formatBytes(result.originalSize)}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-base-200/30 border border-base-200 text-center">
              <span className="text-[10px] uppercase font-bold text-base-content/50 block">Current Size</span>
              <span className="text-sm font-bold text-base-content font-mono">{formatBytes(result.originalSize)}</span>
            </div>
            <div className="p-3 rounded-xl bg-base-200/30 border border-base-200 text-center">
              <span className="text-[10px] uppercase font-bold text-base-content/50 block">Pages</span>
              <span className="text-sm font-bold text-base-content">{result.pageCount} Pages</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Compression Stage</span>
              <span className="text-xs font-bold text-emerald-700">Maximum Efficiency</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-ghost btn-sm rounded-xl gap-2 w-full sm:w-auto text-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Compress Another PDF</span>
            </button>

            <a
              href={result.dataUrl}
              download={result.filename}
              className="btn btn-primary btn-md rounded-2xl gap-2 font-bold px-8 shadow-lg shadow-primary/20 w-full sm:w-auto text-white"
            >
              <Download className="w-4 h-4" />
              <span>Download File ({formatBytes(result.originalSize)})</span>
            </a>
          </div>
        </div>
      )}

      {/* Standard Result Card When Size Was Reduced */}
      {result && !result.isAlreadyMaxCompressed && (
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
      )}
    </div>
  );
}
