'use client';

import React, { useState } from 'react';
import { Loader2, Minimize2, AlertCircle, FileText, CheckCircle2, Sliders, Download, RotateCcw, ShieldCheck, Sparkles, Zap, Flame } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';
import { scrollToTool } from '@/lib/utils/scrollHelper';
import { compressPdf } from '@/lib/browser-converters/pdf-compress';

type CompressionLevel = 'extreme' | 'recommended' | 'low';

interface LevelOption {
  id: CompressionLevel;
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
  quality: 'low' | 'medium' | 'high';
  icon: React.ReactNode;
  activeBorder: string;
  activeBg: string;
  activeRing: string;
  radioColor: string;
}

const LEVELS: LevelOption[] = [
  {
    id: 'extreme',
    title: 'Extreme Compression',
    badge: 'Max Reduction',
    badgeClass: 'bg-rose-500 text-white',
    description: 'Maximum file size reduction with lower image resolution. Perfect for documents with strict upload limits.',
    quality: 'low',
    icon: <Flame className="w-4 h-4 text-rose-500 shrink-0" />,
    activeBorder: 'border-rose-500',
    activeBg: 'bg-rose-500/10',
    activeRing: 'ring-2 ring-rose-500/25',
    radioColor: 'border-rose-500 bg-rose-500',
  },
  {
    id: 'recommended',
    title: 'Recommended',
    badge: 'Best Balance',
    badgeClass: 'bg-emerald-500 text-white',
    description: 'Great quality with high compression. The optimal sweet spot for email attachments and everyday sharing.',
    quality: 'medium',
    icon: <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />,
    activeBorder: 'border-emerald-500',
    activeBg: 'bg-emerald-500/10',
    activeRing: 'ring-2 ring-emerald-500/25',
    radioColor: 'border-emerald-500 bg-emerald-500',
  },
  {
    id: 'low',
    title: 'Low Compression',
    badge: 'High Accuracy',
    badgeClass: 'bg-amber-400 text-amber-950 font-black',
    description: 'Mild compression preserving original image clarity and maximum sharpness for printing and archiving.',
    quality: 'high',
    icon: <Zap className="w-4 h-4 text-amber-500 shrink-0" />,
    activeBorder: 'border-amber-400',
    activeBg: 'bg-amber-400/10',
    activeRing: 'ring-2 ring-amber-400/25',
    radioColor: 'border-amber-400 bg-amber-400',
  },
];

export default function CompressPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('recommended');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('Optimizing PDF Structure...');
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedOption = LEVELS.find((l) => l.id === compressionLevel) || LEVELS[1];

  const handleProcess = async () => {
    if (files.length === 0) return;
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setError(null);
    setIsProcessing(true);
    setResult(null);

    const file = files[0];
    const originalSize = file.size;

    try {
      setProgressText('Analyzing PDF structure...');

      const data = await compressPdf(file, {
        quality: selectedOption.quality,
        onProgress: (pct) => setProgressText(`Optimizing PDF streams & images (${pct}%)...`),
      });

      if (!data || !data.size || data.size <= 0) {
        throw new Error('Unable to compress document. Output file was empty.');
      }

      const isAlreadyMaxCompressed = (data.reductionPercentage ?? 0) <= 0 || data.size >= originalSize;
      const finalSize = isAlreadyMaxCompressed ? originalSize : data.size;
      const reductionPercentage = isAlreadyMaxCompressed ? 0 : (data.reductionPercentage ?? 0);

      setResult({
        success: true,
        filename: data.filename,
        originalSize,
        compressedSize: finalSize,
        reductionPercentage,
        pageCount: data.pageCount || 1,
        dataUrl: data.dataUrl,
        isAlreadyMaxCompressed,
        levelName: selectedOption.title,
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
    scrollToTool();
  };

  return (
    <div className="w-full space-y-6">
      {files.length === 0 && (
        <UploadZone
          accept=".pdf,application/pdf"
          files={files}
          onFilesSelected={setFiles}
          title="Drop PDF file to optimize and compress"
          subtitle="Reduces PDF file size cleanly while preserving crisp text readability"
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* File Info Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300">
            <div className="flex items-center gap-3 truncate">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs sm:max-w-md">
                  {files[0].name}
                </p>
                <p className="text-xs text-base-content/60">
                  Original Size: <strong>{formatBytes(files[0].size)}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="btn btn-ghost btn-xs text-base-content/60 hover:text-error shrink-0"
            >
              Change
            </button>
          </div>

          {/* Compression Level Selector Cards */}
          <div className="space-y-3.5 p-5 sm:p-6 rounded-3xl bg-base-100 border border-base-300 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-primary" />
                Select Compression Level
              </span>
              <span className="text-[11px] text-base-content/50 hidden sm:inline">
                Click to switch mode
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LEVELS.map((level) => {
                const isSelected = compressionLevel === level.id;
                return (
                  <div
                    key={level.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setCompressionLevel(level.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setCompressionLevel(level.id);
                    }}
                    className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 text-left ${
                      isSelected
                        ? `${level.activeBorder} ${level.activeBg} ${level.activeRing} shadow-md`
                        : 'border-base-300 bg-base-100 hover:border-base-400 hover:bg-base-200/40'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 mb-2.5">
                        <div className="flex items-center gap-1.5 shrink-0">
                          {level.icon}
                          <span className="font-extrabold text-sm sm:text-base text-base-content">
                            {level.title}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap shrink-0 shadow-sm ${level.badgeClass}`}
                        >
                          {level.badge}
                        </span>
                      </div>
                      <p className="text-xs text-base-content/70 leading-relaxed">
                        {level.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-base-200/60 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-base-content/50">
                        {isSelected ? 'Active choice' : 'Click to select'}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? level.radioColor : 'border-base-300 bg-transparent'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
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
            className="btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/20 gap-2 h-auto min-h-[3rem] py-3 px-3 text-center leading-snug flex items-center justify-center"
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

      {/* Already Optimal Alert Card */}
      {result && result.isAlreadyMaxCompressed && (
        <div className="w-full p-6 sm:p-8 rounded-3xl bg-base-100 border border-emerald-500/30 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
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
                Your PDF is already at its optimal file size
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-2 text-xs leading-relaxed text-base-content/80">
            <p>
              Your document <strong>{files[0]?.name || result.filename}</strong> is composed of clean vector text and streams with no bloated images or redundant metadata.
            </p>
            <p className="text-base-content/60">
              Further compression without discarding text legibility or removing pages is physically not possible. To preserve complete document fidelity and avoid making the file larger, SnapDoc kept your file at its exact optimal size of <strong>{formatBytes(result.originalSize)}</strong>.
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
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Status</span>
              <span className="text-xs font-bold text-emerald-700">Fully Optimized</span>
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
          extraInfo={`${result.pageCount} Pages • ${result.levelName || 'Compressed'}`}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
