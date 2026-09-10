'use client';

import React, { useState } from 'react';
import { FileCode, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, FileText, Table } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { formatBytes } from '@/lib/utils/formatters';

import { convertDocumentDirect } from '@/lib/conversionEngine';

interface DocToPdfToolProps {
  initialFormat?: 'txt' | 'csv' | 'html' | 'word' | 'excel';
  title?: string;
  subtitle?: string;
}

export default function DocToPdfTool({
  initialFormat = 'txt',
  title = 'Convert Document to PDF',
  subtitle = 'Convert Word, Excel, TXT, CSV, or HTML documents into clean, professional PDF files.',
}: DocToPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [format, setFormat] = useState<'txt' | 'csv' | 'html'>(
    initialFormat === 'csv' || initialFormat === 'excel' ? 'csv' : 'txt'
  );
  const [processing, setProcessing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!file && !textContent.trim()) return;

    setProcessing(true);
    setError(null);

    try {
      // 1. Word to PDF (.docx / .doc)
      if (
        file &&
        (file.name.toLowerCase().endsWith('.docx') ||
          file.name.toLowerCase().endsWith('.doc') ||
          initialFormat === 'word')
      ) {
        const result = await convertDocumentDirect('word-to-pdf', file);
        setResultData({
          dataUrl: result.url,
          filename: result.filename,
          size: result.size,
        });
        setProcessing(false);
        return;
      }

      // 2. Excel / CSV to PDF (.xlsx / .xls / .csv)
      if (
        file &&
        (file.name.toLowerCase().endsWith('.xlsx') ||
          file.name.toLowerCase().endsWith('.xls') ||
          file.name.toLowerCase().endsWith('.csv') ||
          initialFormat === 'excel')
      ) {
        const result = await convertDocumentDirect('excel-to-pdf', file);
        setResultData({
          dataUrl: result.url,
          filename: result.filename,
          size: result.size,
        });
        setProcessing(false);
        return;
      }

      // 3. General Document / Text to PDF
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      if (textContent) {
        formData.append('textContent', textContent);
      }
      formData.append('format', format);

      const res = await fetch('/api/convert-doc', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to convert document to PDF.');
      }

      setResultData({
        dataUrl: data.dataUrl,
        filename: data.filename,
        size: data.size,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error converting document.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTextContent('');
    setResultData(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file && !resultData && (
        <div className="space-y-6">
          <UploadZone
            accept=".xlsx,.xls,.docx,.doc,.txt,.csv,.html,.rtf"
            maxFiles={1}
            maxSizeMb={50}
            title={title}
            subtitle={subtitle}
            onFilesSelected={(files) => setFile(files[0])}
          />

          <div className="p-5 sm:p-6 rounded-2xl bg-base-200/40 border border-base-300 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-base-content/70">
              <FileCode className="w-4 h-4 text-primary" />
              <span>Or Paste Raw Text / CSV directly:</span>
            </div>
            <textarea
              rows={5}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste plain text or comma-separated CSV rows here to instantly generate a PDF..."
              className="textarea textarea-bordered w-full rounded-2xl text-xs font-mono bg-base-100"
            />
            {error && (
              <div className="alert alert-error text-xs rounded-2xl">
                <span>{error}</span>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleProcess}
                disabled={!textContent.trim() || processing}
                className="btn btn-primary btn-sm rounded-xl gap-2 shadow-md shadow-primary/20"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <span>Convert Pasted Text to PDF</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {file && !resultData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                {file.name.endsWith('.csv') ? <Table className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-base-content">{file.name}</h3>
                <p className="text-xs text-base-content/60">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm btn-circle">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="alert alert-error text-xs rounded-2xl">
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-base-200">
            <button
              onClick={handleProcess}
              disabled={processing}
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/20"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Converting to PDF...</span>
                </>
              ) : (
                <>
                  <span>Convert to PDF</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {resultData && (
        <div className="py-6 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold text-base-content">Converted PDF Ready!</h3>
            <p className="text-xs text-base-content/60">{formatBytes(resultData.size)}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={resultData.dataUrl}
              download={resultData.filename}
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/25"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </a>
            <button onClick={handleReset} className="btn btn-ghost text-xs">
              Convert Another Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
