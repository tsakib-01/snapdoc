'use client';

import React, { useState } from 'react';
import { Eye, Layers, SplitSquareVertical } from 'lucide-react';
import { formatBytes } from '@/lib/utils/formatters';

interface ComparisonViewerProps {
  originalUrl: string;
  processedUrl: string;
  originalSize: number;
  processedSize: number;
  originalDimensions?: { width: number; height: number };
  processedDimensions?: { width: number; height: number };
}

export default function ComparisonViewer({
  originalUrl,
  processedUrl,
  originalSize,
  processedSize,
  originalDimensions,
  processedDimensions,
}: ComparisonViewerProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'toggle'>('side-by-side');
  const [activeToggle, setActiveToggle] = useState<'original' | 'processed'>('processed');

  return (
    <div className="w-full space-y-4">
      {/* Mode switcher bar */}
      <div className="flex items-center justify-between pb-2 border-b border-base-200">
        <span className="text-xs font-semibold text-base-content/70">
          Visual Quality Preview
        </span>
        <div className="flex items-center gap-1 bg-base-200 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`btn btn-xs rounded-lg ${
              viewMode === 'side-by-side'
                ? 'btn-primary font-semibold shadow-sm'
                : 'btn-ghost text-base-content/60'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5 mr-1" />
            Side by Side
          </button>
          <button
            type="button"
            onClick={() => setViewMode('toggle')}
            className={`btn btn-xs rounded-lg ${
              viewMode === 'toggle'
                ? 'btn-primary font-semibold shadow-sm'
                : 'btn-ghost text-base-content/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 mr-1" />
            Toggle View
          </button>
        </div>
      </div>

      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original Card */}
          <div className="flex flex-col rounded-2xl border border-base-300 bg-base-100 overflow-hidden shadow-sm">
            <div className="px-3 sm:px-4 py-2 bg-base-200/60 border-b border-base-300 flex items-center justify-between text-xs font-semibold">
              <span className="text-base-content/70">Original Image</span>
              <span className="badge badge-sm badge-neutral">{formatBytes(originalSize)}</span>
            </div>
            <div className="relative p-2 sm:p-4 flex items-center justify-center min-h-[180px] sm:min-h-[260px] bg-transparency-grid">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={originalUrl}
                alt="Original preview"
                className="max-h-[220px] sm:max-h-[320px] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
            {originalDimensions && (
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-base-200/30 text-[10px] sm:text-[11px] text-base-content/60 text-center border-t border-base-200">
                Dimensions: {originalDimensions.width} × {originalDimensions.height} px
              </div>
            )}
          </div>

          {/* Processed Card */}
          <div className="flex flex-col rounded-2xl border-2 border-primary/40 bg-base-100 overflow-hidden shadow-md">
            <div className="px-3 sm:px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between text-xs font-semibold text-primary">
              <span className="flex items-center gap-1.5 font-bold">
                <Eye className="w-3.5 h-3.5" />
                Optimized Result
              </span>
              <span className="badge badge-sm badge-primary text-white font-bold">
                {formatBytes(processedSize)}
              </span>
            </div>
            <div className="relative p-2 sm:p-4 flex items-center justify-center min-h-[180px] sm:min-h-[260px] bg-transparency-grid">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={processedUrl}
                alt="Processed preview"
                className="max-h-[220px] sm:max-h-[320px] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
            {processedDimensions && (
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-base-200/30 text-[10px] sm:text-[11px] text-base-content/60 text-center border-t border-base-200 font-medium">
                Dimensions: {processedDimensions.width} × {processedDimensions.height} px
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Toggle mode */
        <div className="flex flex-col rounded-2xl border border-base-300 bg-base-100 overflow-hidden shadow-sm">
          <div className="p-3 bg-base-200/60 border-b border-base-300 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveToggle('original')}
              className={`btn btn-sm rounded-xl ${
                activeToggle === 'original'
                  ? 'btn-neutral'
                  : 'btn-ghost text-base-content/60'
              }`}
            >
              Original ({formatBytes(originalSize)})
            </button>
            <button
              type="button"
              onClick={() => setActiveToggle('processed')}
              className={`btn btn-sm rounded-xl ${
                activeToggle === 'processed'
                  ? 'btn-primary text-white font-bold'
                  : 'btn-ghost text-base-content/60'
              }`}
            >
              Optimized ({formatBytes(processedSize)})
            </button>
          </div>
          <div className="relative p-6 flex items-center justify-center min-h-[320px] bg-transparency-grid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeToggle === 'original' ? originalUrl : processedUrl}
              alt="Preview"
              className="max-h-[400px] max-w-full object-contain rounded-xl shadow-md"
            />
          </div>
        </div>
      )}
    </div>
  );
}
