'use client';

import React, { useState } from 'react';
import { Loader2, Scissors, Sparkles, AlertCircle, FileText, Check } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

export default function SplitPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [splitMode, setSplitMode] = useState<'range' | 'all'>('range');
  const [rangeInput, setRangeInput] = useState<string>('1-3');
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
      if (splitMode === 'all') {
        formData.append('extractAllSeparate', 'true');
      } else {
        formData.append('range', rangeInput);
      }

      const res = await fetch('/api/split-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to split PDF.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while splitting PDF.');
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
          title="Drop PDF file to split or extract pages"
          subtitle="Extract custom page ranges or separate all pages"
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

          {/* Split Mode Selector */}
          <div className="p-5 rounded-2xl bg-base-200/40 border border-base-300 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 block">
              Choose Split Method
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSplitMode('range')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  splitMode === 'range'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                    : 'border-base-300 bg-base-100 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-base-content">Extract Page Range</span>
                  {splitMode === 'range' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-base-content/60 mt-1">
                  Extract specific pages into one new PDF (e.g. 1-3, 5)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('all')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  splitMode === 'all'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                    : 'border-base-300 bg-base-100 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-base-content">Extract All Pages</span>
                  {splitMode === 'all' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-base-content/60 mt-1">
                  Save every page as a separate PDF bundled in a ZIP
                </p>
              </button>
            </div>

            {splitMode === 'range' && (
              <div className="p-4 rounded-2xl bg-base-100 border border-base-300 space-y-2 animate-in fade-in duration-100">
                <label className="text-xs font-semibold text-base-content/80 block">
                  Enter Page Numbers or Ranges:
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 5, 8-10"
                  className="input input-sm input-bordered w-full rounded-xl font-bold font-mono"
                />
                <span className="text-[11px] text-base-content/50 block">
                  Use commas for multiple pages and hyphens for ranges (e.g. 1-5, 8, 11-12)
                </span>
              </div>
            )}
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
                Splitting PDF...
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5" />
                {splitMode === 'range' ? `Extract Pages (${rangeInput})` : 'Split All Pages to ZIP'}
              </>
            )}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-base-200/50 border border-base-300 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <Scissors className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base text-base-content">PDF Split Completed</h4>
              <p className="text-xs text-base-content/60 mt-0.5">
                Output: {result.filename} ({formatBytes(result.fileSize)})
              </p>
            </div>
          </div>

          <ResultCard
            originalSize={result.originalSize}
            newSize={result.fileSize}
            filename={result.filename}
            dataUrl={result.dataUrl}
            format={result.mode === 'zip-individual' ? 'ZIP' : 'PDF'}
            extraInfo={`${result.pageCount} Pages`}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
