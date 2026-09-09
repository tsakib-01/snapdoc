'use client';

import React from 'react';
import { Download, RefreshCw, CheckCircle2, ArrowDownRight } from 'lucide-react';
import { formatBytes } from '@/lib/utils/formatters';

interface ResultCardProps {
  originalSize: number;
  newSize: number;
  reductionPercentage?: number;
  filename: string;
  dataUrl: string;
  onReset: () => void;
  format?: string;
  dimensions?: { width: number; height: number };
  extraInfo?: string;
}

export default function ResultCard({
  originalSize,
  newSize,
  reductionPercentage,
  filename,
  dataUrl,
  onReset,
  format,
  dimensions,
  extraInfo,
}: ResultCardProps) {
  const calculatedReduction =
    reductionPercentage !== undefined
      ? reductionPercentage
      : originalSize > 0
      ? Math.max(0, parseFloat((((originalSize - newSize) / originalSize) * 100).toFixed(1)))
      : 0;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-base-100 border border-base-300 shadow-xl space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner with Reduction stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-base-200">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-success/15 text-success flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-base-content flex items-center gap-2">
              Optimization Complete!
            </h3>
            <p className="text-xs text-base-content/60">
              Your file is ready for download.
            </p>
          </div>
        </div>

        {calculatedReduction > 0 && (
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
            <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs uppercase font-semibold tracking-wider">Reduction</span>
              <span className="text-sm sm:text-base font-extrabold leading-none">{calculatedReduction}% Smaller</span>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-base-200/50 border border-base-200 text-center">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-base-content/50 font-semibold">Original</span>
          <p className="text-xs sm:text-base font-bold text-base-content mt-0.5 sm:mt-1">{formatBytes(originalSize)}</p>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20 text-center">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-primary font-semibold">New Size</span>
          <p className="text-xs sm:text-base font-extrabold text-primary mt-0.5 sm:mt-1">{formatBytes(newSize)}</p>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-base-200/50 border border-base-200 text-center">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-base-content/50 font-semibold">Format</span>
          <p className="text-xs sm:text-base font-bold text-base-content uppercase mt-0.5 sm:mt-1">{format || 'PDF/IMG'}</p>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-base-200/50 border border-base-200 text-center">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-base-content/50 font-semibold">Info</span>
          <p className="text-xs sm:text-base font-bold text-base-content mt-0.5 sm:mt-1 truncate">
            {dimensions ? `${dimensions.width}×${dimensions.height}` : extraInfo || 'Ready'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 pt-2">
        <button
          type="button"
          onClick={handleDownload}
          className="btn btn-primary btn-sm sm:btn-md rounded-xl sm:rounded-2xl w-full sm:flex-1 gap-2 text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform"
        >
          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          Download {filename}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="btn btn-ghost btn-sm sm:btn-md rounded-xl sm:rounded-2xl border border-base-300 w-full sm:w-auto gap-2 text-base-content/80 hover:text-base-content"
        >
          <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Process Another
        </button>
      </div>
    </div>
  );
}
