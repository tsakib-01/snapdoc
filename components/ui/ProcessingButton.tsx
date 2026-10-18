'use client';

import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface ProcessingButtonProps {
  onClick?: () => void | Promise<void>;
  isProcessing: boolean;
  progress?: number;
  disabled?: boolean;
  children: React.ReactNode;
  loadingLabel?: string;
  className?: string;
  type?: 'button' | 'submit';
  showStageIndicator?: boolean;
}

export default function ProcessingButton({
  onClick,
  isProcessing,
  progress = 0,
  disabled = false,
  children,
  loadingLabel = 'Processing',
  className = '',
  type = 'button',
  showStageIndicator = true,
}: ProcessingButtonProps) {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  const getStageText = (p: number) => {
    if (p >= 100) return 'Finalizing output...';
    if (p >= 80) return 'Optimizing quality & output...';
    if (p >= 40) return 'Processing data stream...';
    return 'Analyzing file structure...';
  };

  if (!isProcessing) {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/25 hover:shadow-primary/35 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 h-auto min-h-[3.25rem] py-3 px-4 text-center leading-snug flex items-center justify-center gap-2 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 select-none">
      {/* Active Processing Card Button */}
      <div
        className={`relative overflow-hidden rounded-2xl w-full bg-primary text-white font-bold shadow-xl shadow-primary/25 h-auto min-h-[3.25rem] py-3 px-4 sm:px-5 flex items-center justify-between transition-all duration-200 border border-white/10 ${className}`}
      >
        {/* Animated Progress Fill Track inside Button */}
        <div
          className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-200 ease-out"
          style={{ width: `${clampedProgress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>

        {/* Left: Spinner & Loading Label */}
        <div className="relative z-10 flex items-center gap-2.5 min-w-0">
          {clampedProgress >= 100 ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 animate-in zoom-in-75 duration-150 shrink-0" />
          ) : (
            <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
          )}
          <span className="text-sm sm:text-base font-bold truncate">
            {clampedProgress >= 100 ? 'Completed!' : `${loadingLabel}...`}
          </span>
        </div>

        {/* Right: Modern High-Tech Percentage Badge */}
        <div className="relative z-10 flex items-center gap-1.5 shrink-0">
          <span className="px-2.5 py-1 rounded-xl bg-black/25 text-white font-mono font-bold text-xs sm:text-sm tracking-wide shadow-inner backdrop-blur-xs flex items-center gap-1 border border-white/15">
            <span>{clampedProgress}</span>
            <span className="text-[10px] opacity-80">%</span>
          </span>
        </div>
      </div>

      {/* Sleek Progress Micro-Bar & Dynamic Stage Status */}
      {showStageIndicator && (
        <div className="w-full space-y-1 px-1">
          <div className="w-full bg-base-300/80 dark:bg-base-200 h-1.5 rounded-full overflow-hidden p-[1px] border border-base-300 dark:border-base-200/60 shadow-inner">
            <div
              className="bg-primary h-full rounded-full transition-all duration-200 ease-out relative"
              style={{ width: `${clampedProgress}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/80 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-base-content/60 px-0.5">
            <span className="flex items-center gap-1.5 truncate">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  clampedProgress >= 100 ? 'bg-emerald-500' : 'bg-primary animate-ping'
                }`}
              />
              <span className="truncate">{getStageText(clampedProgress)}</span>
            </span>
            <span className="font-bold text-primary shrink-0">{clampedProgress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
