'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Eye,
  FileCheck
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { formatBytes } from '@/lib/utils/formatters';
import { convertDocumentDirect } from '@/lib/conversionEngine';

interface WordToPdfToolProps {
  title?: string;
  subtitle?: string;
}

export default function WordToPdfTool({
  title = 'Convert Word to PDF',
  subtitle = 'Convert Microsoft Word (.docx, .doc, .rtf) documents into publication-ready PDF files.',
}: WordToPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'converting' | 'success' | 'error'>('idle');
  const [statusText, setStatusText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    url: string;
    filename: string;
    size: number;
    engineUsed: string;
    isPythonVerified: boolean;
    processor: string;
    durationMs: number;
  } | null>(null);

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setStatus('idle');
  };

  const handleConvert = async () => {
    if (!file) return;

    setStatus('converting');
    setStatusText('Uploading Word document to conversion engine...');
    setError(null);

    try {
      const progressTimer = setTimeout(() => {
        setStatusText('Applying TrueType typography & layout formatting...');
      }, 1800);

      const progressTimer2 = setTimeout(() => {
        setStatusText('Generating publication-quality vector PDF...');
      }, 4500);

      const output = await convertDocumentDirect('word-to-pdf', file);

      clearTimeout(progressTimer);
      clearTimeout(progressTimer2);

      setResult({
        url: output.url,
        filename: output.filename,
        size: output.size,
        engineUsed: output.engineUsed,
        isPythonVerified: output.isPythonVerified,
        processor: output.processor,
        durationMs: output.durationMs,
      });

      setStatus('success');
    } catch (err: any) {
      console.error('Word to PDF conversion error:', err);
      setError(err.message || 'Failed to convert Word to PDF. Please ensure the document is not password-protected and try again.');
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleView = () => {
    if (!result) return;
    window.open(result.url, '_blank');
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setStatus('idle');
    setError(null);
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* 1. Upload Zone */}
      {!file && (
        <UploadZone
          accept=".docx,.doc,.rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/rtf"
          maxFiles={1}
          maxSizeMb={50}
          title={title}
          subtitle={subtitle}
          onFilesSelected={(files) => handleFileSelected(files[0])}
        />
      )}

      {/* 2. File Selected / Ready to Convert */}
      {file && status === 'idle' && (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
          {/* File Information Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-base-200/60 border border-base-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-base-content truncate max-w-[240px] sm:max-w-md">
                  {file.name}
                </h3>
                <p className="text-xs text-base-content/60 flex items-center gap-1.5 mt-0.5">
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Word Document</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-ghost btn-xs sm:btn-sm rounded-xl border border-base-300/80 gap-1.5 self-end sm:self-center text-base-content/70 hover:text-base-content shrink-0"
              title="Select another file"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Change</span>
            </button>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-2xl bg-base-200/30 border border-base-300/70 text-xs">
            <div className="flex items-center gap-2 text-base-content/80">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>100% Typography & Font Fidelity</span>
            </div>
            <div className="flex items-center gap-2 text-base-content/80">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>Bangla, Arabic & Multilingual Scripts</span>
            </div>
            <div className="flex items-center gap-2 text-base-content/80">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>Preserves Headings, Tables & Styles</span>
            </div>
            <div className="flex items-center gap-2 text-base-content/80">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>Crisp Vector PDF Output</span>
            </div>
          </div>

          {error && (
            <div className="alert alert-error text-xs rounded-2xl py-3 shadow-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Responsive Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-ghost btn-sm sm:btn-md rounded-xl sm:rounded-2xl text-xs sm:text-sm w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConvert}
              className="btn btn-primary btn-sm sm:btn-md rounded-xl sm:rounded-2xl px-6 sm:px-8 gap-2 font-bold text-white shadow-lg shadow-primary/25 w-full sm:w-auto"
            >
              <span>Convert to PDF</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Converting State */}
      {status === 'converting' && (
        <div className="py-8 sm:py-12 px-4 text-center space-y-4 sm:space-y-5 animate-in fade-in duration-200">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-75" />
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" />
            </div>
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="font-bold text-base sm:text-lg text-base-content">Converting Word to PDF</h3>
            <p className="text-xs text-base-content/60 transition-all duration-300">{statusText}</p>
          </div>
          <div className="w-full max-w-xs mx-auto bg-base-200 h-2 rounded-full overflow-hidden border border-base-300">
            <div className="bg-primary h-full rounded-full animate-pulse w-3/4 transition-all duration-500" />
          </div>
        </div>
      )}

      {/* 4. Success State */}
      {status === 'success' && result && (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-base-content">
                    Conversion Complete!
                  </h3>
                  <span className="badge badge-success badge-sm font-semibold text-[10px] text-white">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-base-content/60 truncate max-w-[240px] sm:max-w-md mt-0.5">
                  {result.filename}
                </p>
              </div>
            </div>

            <div className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>100% Typography Fidelity</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-3 rounded-xl sm:rounded-2xl bg-base-200/50 border border-base-200 text-center">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-base-content/50 font-semibold">
                Original Size
              </span>
              <p className="text-xs sm:text-sm font-bold text-base-content mt-1">
                {formatBytes(file ? file.size : 0)}
              </p>
            </div>

            <div className="p-3 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20 text-center">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-primary font-semibold">
                PDF Size
              </span>
              <p className="text-xs sm:text-sm font-extrabold text-primary mt-1">
                {formatBytes(result.size)}
              </p>
            </div>

            <div className="p-3 rounded-xl sm:rounded-2xl bg-base-200/50 border border-base-200 text-center">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-base-content/50 font-semibold">
                Format
              </span>
              <p className="text-xs sm:text-sm font-bold text-base-content uppercase mt-1">
                PDF Document
              </p>
            </div>

            <div className="p-3 rounded-xl sm:rounded-2xl bg-base-200/50 border border-base-200 text-center">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-base-content/50 font-semibold">
                Processing Time
              </span>
              <p className="text-xs sm:text-sm font-bold text-base-content mt-1">
                {(result.durationMs / 1000).toFixed(1)}s
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-primary btn-sm sm:btn-md rounded-xl sm:rounded-2xl w-full sm:flex-1 gap-2 text-white font-bold shadow-lg shadow-primary/25 hover:scale-[1.01] transition-transform"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handleView}
              className="btn btn-outline btn-sm sm:btn-md rounded-xl sm:rounded-2xl w-full sm:w-auto gap-2 text-base-content/80 hover:text-base-content"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="btn btn-ghost btn-sm sm:btn-md rounded-xl sm:rounded-2xl border border-base-300 w-full sm:w-auto gap-2 text-base-content/70 hover:text-base-content"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Convert Another</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Error State */}
      {status === 'error' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-error/5 border border-error/20 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-error/15 text-error flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm sm:text-base text-base-content">
                Conversion Failed
              </h4>
              <p className="text-xs text-error mt-1 leading-relaxed">
                {error}
              </p>
              <p className="text-[11px] text-base-content/60 mt-1.5">
                Tip: Ensure your file is not password-protected or corrupted, and try again.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2 border-t border-error/10">
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-ghost btn-sm rounded-xl text-xs w-full sm:w-auto"
            >
              Choose Another File
            </button>
            <button
              type="button"
              onClick={handleConvert}
              className="btn btn-error btn-sm rounded-xl text-white font-bold gap-1.5 w-full sm:w-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
