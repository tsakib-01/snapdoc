'use client';

import React, { useState } from 'react';
import { Hash, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { formatBytes } from '@/lib/utils/formatters';

export default function PageNumbererTool() {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<string>('bottom-center');
  const [format, setFormat] = useState<string>('page-n-of-total');
  const [startPage, setStartPage] = useState<number>(1);
  const [startNumber, setStartNumber] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(10);
  const [processing, setProcessing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('position', position);
      formData.append('format', format);
      formData.append('startPage', startPage.toString());
      formData.append('startNumber', startNumber.toString());
      formData.append('fontSize', fontSize.toString());

      const res = await fetch('/api/page-numbers-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to number PDF.');
      }

      setResultData({
        dataUrl: data.dataUrl,
        filename: data.filename,
        size: data.size,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error adding page numbers.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResultData(null);
    setError(null);
  };

  const positions = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file && (
        <UploadZone
          accept="application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title="Upload PDF to Add Page Numbers"
          subtitle="Stamp page numbers at any position with customizable numbering formats."
          onFilesSelected={(files) => setFile(files[0])}
        />
      )}

      {file && !resultData && (
        <div className="p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Hash className="w-5 h-5" />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Position Picker */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                Number Placement Position
              </label>
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-base-200/50 border border-base-300 aspect-video flex items-center justify-center">
                {positions.map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => setPosition(pos.id)}
                    className={`p-2.5 rounded-xl text-xs font-semibold transition-all ${
                      position === pos.id
                        ? 'bg-primary text-white shadow-md shadow-primary/30 scale-105'
                        : 'bg-base-100 hover:bg-base-300 text-base-content/70 border border-base-300/50'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format & Options */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                  Numbering Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="select select-bordered select-sm w-full rounded-xl"
                >
                  <option value="page-n-of-total">Page 1 of 10</option>
                  <option value="n-of-total">1 of 10</option>
                  <option value="page-n">Page 1</option>
                  <option value="n">1, 2, 3...</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-base-content/70 font-medium">Start Numbering From Page</label>
                  <input
                    type="number"
                    min="1"
                    value={startPage}
                    onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input input-bordered input-sm w-full rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-base-content/70 font-medium">First Page Number Value</label>
                  <input
                    type="number"
                    min="1"
                    value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input input-bordered input-sm w-full rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-base-content/70">
                  <span>Font Size</span>
                  <span className="font-bold text-primary">{fontSize}pt</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="18"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="range range-xs range-primary"
                />
              </div>
            </div>
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
                  <span>Numbering PDF...</span>
                </>
              ) : (
                <>
                  <span>Add Page Numbers</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {resultData && (
        <div className="p-8 rounded-3xl bg-base-100 border border-base-300 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold text-base-content">Numbered PDF Ready!</h3>
            <p className="text-xs text-base-content/60">{formatBytes(resultData.size)}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={resultData.dataUrl}
              download={resultData.filename}
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/25"
            >
              <Download className="w-4 h-4" />
              <span>Download Numbered PDF</span>
            </a>
            <button onClick={handleReset} className="btn btn-ghost text-xs">
              Number Another PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
