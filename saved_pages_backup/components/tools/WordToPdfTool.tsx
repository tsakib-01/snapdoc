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
  Eye
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
    endpoint: string;
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
    setStatusText('Preparing Word document for conversion...');
    setError(null);

    try {
      const progressTimer = setTimeout(() => {
        setStatusText('Applying TrueType typography & layout formatting...');
      }, 2000);

      const progressTimer2 = setTimeout(() => {
        setStatusText('Generating publication-quality PDF...');
      }, 5000);

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
        endpoint: output.endpoint,
      });

      setStatus('success');
    } catch (err: any) {
      console.error('Word to PDF conversion error:', err);
      setError(err.message || 'Failed to convert Word to PDF. Please try again.');
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
    <div className="w-full max-w-3xl mx-auto space-y-6">
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

      {file && status === 'idle' && (
        <div className="card bg-base-100 border border-base-300 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-base-content">{file.name}</h3>
                <p className="text-xs text-base-content/60">{formatBytes(file.size)} • Word Document</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="btn btn-ghost btn-sm btn-circle"
              title="Choose another file"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-base-200/50 border border-base-300/60 text-xs">
            <div className="flex items-center gap-2 text-base-content/80">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>100% Typography & Font Fidelity</span>
            </div>
            <div className="flex items-center gap-2 text-base-content/80">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>Bangla, Arabic & Indic Script Support</span>
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
            <div className="alert alert-error text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-ghost rounded-2xl text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConvert}
              className="btn btn-primary px-8 rounded-2xl gap-2 font-bold shadow-lg shadow-primary/20"
            >
              <span>Convert to PDF</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {status === 'converting' && (
        <div className="card bg-base-100 border border-base-300 shadow-xl rounded-3xl p-10 text-center space-y-5">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-base-content">Converting Word to PDF</h3>
            <p className="text-xs text-base-content/60">{statusText}</p>
          </div>
          <div className="w-full max-w-xs mx-auto bg-base-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {status === 'success' && result && (
        <div className="card bg-base-100 border border-emerald-500/30 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Conversion Complete
              </span>
              <h3 className="font-bold text-base text-base-content truncate mt-1">
                {result.filename}
              </h3>
              <p className="text-xs text-base-content/60">
                {formatBytes(result.size)} • Publication-Ready PDF
              </p>
            </div>
          </div>


          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-base-200">
            <button
              onClick={handleReset}
              className="btn btn-ghost btn-sm rounded-2xl gap-2 text-xs w-full sm:w-auto"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Convert Another File</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleView}
                className="btn btn-outline btn-sm rounded-2xl gap-2 text-xs flex-1 sm:flex-initial"
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>

              <button
                onClick={handleDownload}
                className="btn btn-primary px-8 rounded-2xl gap-2 font-bold shadow-lg shadow-primary/20 flex-1 sm:flex-initial"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="card bg-base-100 border border-error/30 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base text-base-content">Conversion Failed</h3>
              <p className="text-xs text-error mt-0.5">{error}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-error/5 border border-error/20 text-[11px] font-mono text-base-content/70">
            <strong>Endpoint:</strong> https://snapdoc-qvmv.onrender.com/api/convert/word-to-pdf<br />
            <strong>Error Info:</strong> {error}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleReset}
              className="btn btn-ghost btn-sm rounded-2xl text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleConvert}
              className="btn btn-primary btn-sm rounded-2xl gap-2 font-bold"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
