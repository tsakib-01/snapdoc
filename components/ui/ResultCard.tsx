'use client';

import React, { useState } from 'react';
import {
  Download,
  RotateCcw,
  FileCheck2,
  FileText,
  ImageIcon,
  HardDrive,
  Calendar,
  Layers,
  ArrowDownRight,
  Eye,
  X,
  Maximize2,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils/formatters';
import PdfPreviewModalViewer from '@/components/ui/PdfPreviewModalViewer';

export interface ResultCardProps {
  originalSize?: number;
  newSize: number;
  reductionPercentage?: number;
  filename: string;
  dataUrl: string;
  onReset: () => void;
  format?: string;
  dimensions?: { width: number; height: number };
  extraInfo?: string;
  title?: string;
  subtitle?: string;
  resetLabel?: string;
  pageCount?: number;
  onPreview?: () => void;
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
  title,
  subtitle,
  resetLabel,
  pageCount,
  onPreview,
}: ResultCardProps) {
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const effectiveOriginalSize = originalSize !== undefined ? originalSize : newSize;
  const calculatedReduction =
    reductionPercentage !== undefined
      ? reductionPercentage
      : effectiveOriginalSize > newSize
      ? Math.max(0, parseFloat((((effectiveOriginalSize - newSize) / effectiveOriginalSize) * 100).toFixed(1)))
      : 0;

  const isPdf =
    (format && format.toLowerCase() === 'pdf') ||
    filename.toLowerCase().endsWith('.pdf');

  const isImage =
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff', 'ico'].includes(
      (format || '').toLowerCase()
    ) || /\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff|ico)$/i.test(filename);

  const displayFormat = (
    format ||
    (isPdf ? 'PDF' : isImage ? filename.split('.').pop()?.toUpperCase() || 'IMG' : 'FILE')
  ).toUpperCase();

  const [createdTimestamp] = useState<string>(() => {
    return new Date().toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  });

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPreview = () => {
    if (onPreview) {
      onPreview();
    } else {
      setShowPreviewModal(true);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Area: Centered on mobile, left-aligned on desktop */}
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-3 sm:gap-3.5">
        <div className="w-11 h-11 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs sm:mt-0.5">
          <FileCheck2 className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-lg sm:text-2xl text-base-content leading-snug sm:leading-tight">
            {title || (isPdf ? 'Your PDF is ready for download!' : 'Your file is ready for download!')}
          </h3>
          <p className="text-xs sm:text-sm text-base-content/60 leading-relaxed max-w-sm sm:max-w-none">
            {subtitle || 'Your file has been processed successfully. You can now download it or perform other actions below.'}
          </p>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="w-full rounded-3xl bg-base-100 border border-base-300 p-5 sm:p-7 space-y-6 shadow-sm">
        {/* Top file summary card */}
        <div className="rounded-2xl bg-blue-50/60 dark:bg-base-200/50 border border-blue-100/80 dark:border-base-300 p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Document/File Icon */}
            {isPdf ? (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            ) : isImage ? (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 shadow-xs">
                <ImageIcon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            )}

            {/* File Meta */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-base sm:text-lg text-base-content truncate">
                  {filename}
                </h4>
                <span className="badge badge-sm bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-none font-bold">
                  Ready
                </span>
              </div>
              <p className="text-xs sm:text-sm text-base-content/60 mt-0.5">
                {pageCount ? `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}  •  ` : ''}
                {formatBytes(newSize)}  •  {displayFormat}
              </p>
            </div>
          </div>

          {/* Right Status / Reduction Pill */}
          {calculatedReduction > 0 ? (
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold tracking-wider leading-none">Reduction</span>
                <span className="text-xs sm:text-sm font-extrabold leading-none mt-1">{calculatedReduction}% Smaller</span>
              </div>
            </div>
          ) : extraInfo ? (
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-base-100 border border-base-200 shadow-xs shrink-0">
              <span className="text-xs font-bold text-base-content/80">{extraInfo}</span>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-primary btn-md rounded-xl font-bold text-white shadow-md shadow-primary/20 gap-2 px-3 sm:px-6 flex-1 sm:flex-none justify-center flex-row flex-nowrap whitespace-nowrap"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="inline sm:hidden">Download</span>
              <span className="hidden sm:inline">Download File</span>
            </button>

            {dataUrl && (
              <button
                type="button"
                onClick={handleOpenPreview}
                className="btn btn-ghost border border-base-300 btn-md rounded-xl font-semibold gap-2 px-3 sm:px-5 text-base-content/70 hover:text-base-content hover:bg-base-200 flex-1 sm:flex-none justify-center flex-row flex-nowrap whitespace-nowrap"
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span>Preview</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onReset}
            className="btn btn-ghost border border-base-300 btn-md rounded-xl font-semibold gap-1.5 px-4 text-base-content/70 hover:text-base-content hover:bg-base-200 w-full sm:w-auto justify-center flex-row flex-nowrap whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span className="truncate">{resetLabel || 'Process Another'}</span>
          </button>
        </div>

        {/* File Details Section */}
        <div className="pt-4 border-t border-base-200 space-y-3.5">
          <h5 className="font-bold text-sm sm:text-base text-base-content">File Details</h5>
          <div className="space-y-2.5 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                <FileText className="w-4 h-4 text-base-content/40" />
                <span>File name</span>
              </span>
              <span className="text-base-content/40">:</span>
              <span className="font-semibold text-base-content truncate">{filename}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                <HardDrive className="w-4 h-4 text-base-content/40" />
                <span>File size</span>
              </span>
              <span className="text-base-content/40">:</span>
              <span className="font-semibold text-base-content">
                {formatBytes(newSize)}
                {calculatedReduction > 0 && (
                  <span className="text-xs font-normal text-base-content/50 ml-2">
                    (was {formatBytes(effectiveOriginalSize)}, saved {calculatedReduction}%)
                  </span>
                )}
              </span>
            </div>

            {pageCount ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                  <Layers className="w-4 h-4 text-base-content/40" />
                  <span>Pages</span>
                </span>
                <span className="text-base-content/40">:</span>
                <span className="font-semibold text-base-content">{pageCount} pages</span>
              </div>
            ) : dimensions ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                  <Maximize2 className="w-4 h-4 text-base-content/40" />
                  <span>Dimensions</span>
                </span>
                <span className="text-base-content/40">:</span>
                <span className="font-semibold text-base-content">
                  {dimensions.width} × {dimensions.height} px
                </span>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                <Calendar className="w-4 h-4 text-base-content/40" />
                <span>Created</span>
              </span>
              <span className="text-base-content/40">:</span>
              <span className="font-semibold text-base-content">{createdTimestamp}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Built-in Preview Modal */}
      {showPreviewModal && dataUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="relative bg-base-100 rounded-3xl p-4 sm:p-5 max-w-4xl w-full h-[85vh] flex flex-col gap-3 shadow-2xl border border-base-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-base-200">
              <div className="flex items-center gap-2 min-w-0">
                {isPdf ? (
                  <FileText className="w-5 h-5 text-red-500 shrink-0" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-primary shrink-0" />
                )}
                <h5 className="font-bold text-sm sm:text-base text-base-content truncate">
                  {filename}
                </h5>
                <span className="badge badge-sm font-semibold">{formatBytes(newSize)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="btn btn-xs btn-primary font-bold gap-1 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="btn btn-ghost btn-xs btn-circle"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-base-200/50 rounded-2xl overflow-hidden flex items-center justify-center p-2">
              {isPdf ? (
                <PdfPreviewModalViewer dataUrl={dataUrl} filename={filename} />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={dataUrl}
                  alt={filename}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
