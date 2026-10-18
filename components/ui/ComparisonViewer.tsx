'use client';

import React, { useState } from 'react';
import { Eye, Layers, SplitSquareVertical } from 'lucide-react';
import { formatBytes } from '@/lib/utils/formatters';
import { useLanguage } from '@/lib/i18n/LanguageContext';

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
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'side-by-side' | 'toggle'>('side-by-side');
  const [activeToggle, setActiveToggle] = useState<'original' | 'processed'>('processed');

  return (
    <div className="w-full space-y-4">
      {/* Mode switcher bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-base-200">
        <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-primary" />
          {t('visualQualityPreview', 'Visual Quality Preview')}
        </span>
        <div className="inline-flex items-center self-start sm:self-auto gap-1 bg-base-200/80 p-1 rounded-xl border border-base-300 max-w-full">
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`btn btn-xs h-7 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              viewMode === 'side-by-side'
                ? 'btn-primary text-white shadow-xs'
                : 'btn-ghost text-base-content/70 hover:text-base-content'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            {t('sideBySide', 'Side by Side')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('toggle')}
            className={`btn btn-xs h-7 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              viewMode === 'toggle'
                ? 'btn-primary text-white shadow-xs'
                : 'btn-ghost text-base-content/70 hover:text-base-content'
            }`}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            {t('toggleView', 'Toggle View')}
          </button>
        </div>
      </div>

      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original Card */}
          <div className="flex flex-col rounded-2xl border border-base-300 bg-base-100 overflow-hidden shadow-sm">
            <div className="px-3 sm:px-4 py-2 bg-base-200/60 border-b border-base-300 flex items-center justify-between text-xs font-semibold">
              <span className="text-base-content/70">{t('originalImage', 'Original Image')}</span>
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
                {t('dimensions', 'Dimensions')}: {originalDimensions.width} × {originalDimensions.height} px
              </div>
            )}
          </div>

          {/* Processed Card */}
          <div className="flex flex-col rounded-2xl border-2 border-primary/40 bg-base-100 overflow-hidden shadow-md">
            <div className="px-3 sm:px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between text-xs font-semibold text-primary">
              <span className="flex items-center gap-1.5 font-bold">
                <Eye className="w-3.5 h-3.5" />
                {t('optimizedResult', 'Optimized Result')}
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
                {t('dimensions', 'Dimensions')}: {processedDimensions.width} × {processedDimensions.height} px
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
              {t('original', 'Original')} ({formatBytes(originalSize)})
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
              {t('optimized', 'Optimized')} ({formatBytes(processedSize)})
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
