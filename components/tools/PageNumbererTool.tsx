'use client';

import React, { useState } from 'react';
import { Hash, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, Eye, FileText } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails, PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';

export default function PageNumbererTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageThumbnail[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loadingThumbnails, setLoadingThumbnails] = useState<boolean>(false);

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

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResultData(null);
    setLoadingThumbnails(true);

    try {
      const { thumbnails } = await extractPdfThumbnails(selectedFile);
      setPages(thumbnails);
      setCurrentPage(1);
    } catch (err: any) {
      console.error(err);
      setError('Could not extract thumbnails. You can still apply page numbers.');
    } finally {
      setLoadingThumbnails(false);
    }
  };

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
    setPages([]);
    setCurrentPage(1);
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

  const getSampleText = (pageNum: number) => {
    const total = pages.length || 1;
    const computedNum = startNumber + (pageNum - startPage);
    if (pageNum < startPage) return '';
    if (format === 'page-n-of-total') return `Page ${computedNum} of ${total}`;
    if (format === 'n-of-total') return `${computedNum} of ${total}`;
    if (format === 'page-n') return `Page ${computedNum}`;
    return `${computedNum}`;
  };

  const activeThumbnail = pages[currentPage - 1];

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-center':
      default:
        return 'bottom-4 left-1/2 -translate-x-1/2';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {!file && (
        <UploadZone
          accept="application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title="Upload PDF to Add Page Numbers"
          subtitle="Stamp page numbers at any position with customizable numbering formats."
          onFilesSelected={(files) => handleFileSelected(files[0])}
        />
      )}

      {loadingThumbnails && (
        <div className="py-12 text-center space-y-4">
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
          <h3 className="font-bold text-base">Loading Document Pages...</h3>
          <p className="text-xs text-base-content/60">Rendering visual preview studio</p>
        </div>
      )}

      {file && !loadingThumbnails && !resultData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-base-content truncate max-w-[200px] sm:max-w-md">{file.name}</h3>
                <p className="text-xs text-base-content/60">{formatBytes(file.size)} • {pages.length} Pages</p>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm btn-circle" title="Reset">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Visual Page Preview */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-base-200/50 p-4 sm:p-6 rounded-2xl border border-base-300">
              <div className="w-full flex items-center justify-between pb-3 text-xs font-bold text-base-content/70">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  Live Placement Preview (Page {currentPage} of {pages.length || 1})
                </span>
                <span className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Real-time preview
                </span>
              </div>

              {activeThumbnail ? (
                <div
                  style={{ aspectRatio: `${activeThumbnail.aspectRatio}` }}
                  className="relative w-full max-w-[340px] sm:max-w-[400px] bg-white rounded-xl shadow-lg overflow-hidden border border-base-300 select-none my-2"
                >
                  <img
                    src={activeThumbnail.dataUrl}
                    alt={`Page ${currentPage}`}
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {/* Stamp Badge */}
                  {getSampleText(currentPage) && (
                    <div
                      className={`absolute px-2.5 py-1 rounded bg-primary text-white font-mono text-xs font-bold shadow-md pointer-events-none transition-all duration-200 ${getPositionClasses()}`}
                    >
                      {getSampleText(currentPage)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-64 bg-base-100 rounded-xl border border-dashed border-base-300 flex items-center justify-center text-xs text-base-content/50">
                  <FileText className="w-8 h-8 opacity-40 mb-2 block" />
                  PDF Ready
                </div>
              )}

              {/* Page Thumbnails Selector Strip */}
              {pages.length > 1 && (
                <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 border-t border-base-200 mt-3">
                  {pages.map((pg) => (
                    <button
                      key={pg.pageNumber}
                      onClick={() => setCurrentPage(pg.pageNumber)}
                      className={`relative shrink-0 w-12 sm:w-14 rounded-lg p-1 border-2 transition-all ${
                        currentPage === pg.pageNumber ? 'border-primary bg-primary/10 scale-105' : 'border-base-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={pg.dataUrl} alt={`P${pg.pageNumber}`} className="w-full h-auto rounded object-contain bg-white" />
                      <span className="block text-[9px] font-bold text-center mt-0.5">{pg.pageNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Controls */}
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Position Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                    Number Placement Position
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-base-200/50 border border-base-300">
                    {positions.map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
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
                <div className="space-y-3 p-4 rounded-2xl bg-base-200/40 border border-base-300">
                  <div className="space-y-1">
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
                      <label className="text-xs text-base-content/70 font-medium">Start From Page</label>
                      <input
                        type="number"
                        min="1"
                        value={startPage}
                        onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                        className="input input-bordered input-sm w-full rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-base-content/70 font-medium">First Number Value</label>
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

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={processing}
                  className="btn btn-primary w-full rounded-2xl gap-2 shadow-lg shadow-primary/25 font-bold"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Numbering PDF...</span>
                    </>
                  ) : (
                    <>
                      <Hash className="w-4 h-4" />
                      <span>Add Page Numbers</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
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
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/25 font-bold"
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

