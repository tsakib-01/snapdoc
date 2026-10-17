'use client';

import React, { useState } from 'react';
import { Hash, RotateCcw, ArrowRight, Eye, FileText, Minus, Plus } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { extractPdfThumbnails, PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';
import { addPageNumbersToPdf } from '@/lib/pdf/pageNumberer';

export default function PageNumbererTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageThumbnail[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loadingThumbnails, setLoadingThumbnails] = useState<boolean>(false);

  const [position, setPosition] = useState<string>('bottom-center');
  const [format, setFormat] = useState<string>('page-n-of-total');
  const [startPage, setStartPage] = useState<number>(1);
  const [startNumber, setStartNumber] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(11);
  const [fontColor, setFontColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('transparent');

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
      // 1. Direct client-side processing using pdf-lib:
      // Instant, 100% private, works offline, and eliminates mobile network "failed to fetch"
      const arrayBuffer = await file.arrayBuffer();
      const numberedBytes = await addPageNumbersToPdf(arrayBuffer, {
        position: position as any,
        format: format as any,
        startPage,
        startNumber,
        fontSize,
        fontColor,
        backgroundColor: bgColor,
      });

      const blob = new Blob([numberedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const dataUrl = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      setResultData({
        dataUrl,
        filename: `${baseName}_numbered.pdf`,
        size: blob.size,
      });
    } catch (err: any) {
      console.warn('Client-side processing fallback to API:', err);
      // Fallback to server route if client environment encounters an unexpected issue
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('position', position);
        formData.append('format', format);
        formData.append('startPage', startPage.toString());
        formData.append('startNumber', startNumber.toString());
        formData.append('fontSize', fontSize.toString());
        formData.append('fontColor', fontColor);
        formData.append('backgroundColor', bgColor);

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
      } catch (apiErr: any) {
        console.error(apiErr);
        setError(apiErr.message || err.message || 'Error adding page numbers.');
      }
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
      {(!file || loadingThumbnails) && (
        <UploadZone
          accept=".pdf,application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title="Upload PDF to Add Page Numbers"
          subtitle="Stamp page numbers at any position with customizable numbering formats."
          onFilesSelected={(files) => handleFileSelected(files[0])}
          loading={loadingThumbnails}
          loadingMessage="Loading document pages & initializing numbering studio..."
          files={file ? [file] : []}
        />
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
                  className="relative w-full max-w-[340px] sm:max-w-[400px] bg-white rounded-none shadow-lg border border-base-300 select-none my-2"
                >
                  <img
                    src={activeThumbnail.dataUrl}
                    alt={`Page ${currentPage}`}
                    className="w-full h-full object-contain pointer-events-none rounded-none"
                  />

                  {/* Stamp Badge with Live Font Size, Font Color, and Background Color */}
                  {getSampleText(currentPage) && (
                    <div
                      style={{
                        fontSize: `${Math.max(8, fontSize)}px`,
                        color: fontColor,
                        backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor,
                        fontFamily: "'HelveticaBoldWeb', 'Helvetica Neue', Helvetica, Arial, sans-serif",
                        fontWeight: 700,
                      }}
                      className={`absolute px-2 py-0.5 rounded font-bold pointer-events-none transition-all duration-150 ${getPositionClasses()} ${
                        bgColor === 'transparent'
                          ? 'border border-dashed border-primary/50 bg-primary/5 backdrop-blur-[1px]'
                          : 'shadow-md border'
                      }`}
                    >
                      {getSampleText(currentPage)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative w-full max-w-[340px] sm:max-w-[400px] aspect-[1/1.414] bg-white rounded-xl shadow-lg overflow-hidden border border-base-300 select-none my-2 p-6 flex flex-col justify-between">
                  <div className="space-y-2.5 opacity-20 pointer-events-none">
                    <div className="h-3.5 bg-base-content/40 rounded w-3/4"></div>
                    <div className="h-2.5 bg-base-content/30 rounded w-full"></div>
                    <div className="h-2.5 bg-base-content/30 rounded w-5/6"></div>
                    <div className="h-2.5 bg-base-content/30 rounded w-4/6"></div>
                  </div>
                  <div className="flex flex-col items-center justify-center text-xs text-base-content/40 font-medium my-auto pointer-events-none">
                    <FileText className="w-6 h-6 mb-1 opacity-50" />
                    <span>Page {currentPage} Preview</span>
                  </div>
                  <div className="space-y-2.5 opacity-20 pointer-events-none">
                    <div className="h-2.5 bg-base-content/30 rounded w-full"></div>
                    <div className="h-2.5 bg-base-content/30 rounded w-4/5"></div>
                  </div>

                  {/* Stamp Badge with Live Font Size, Font Color, and Background Color */}
                  {getSampleText(currentPage) && (
                    <div
                      style={{
                        fontSize: `${Math.max(8, fontSize)}px`,
                        color: fontColor,
                        backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor,
                        fontFamily: "'HelveticaBoldWeb', 'Helvetica Neue', Helvetica, Arial, sans-serif",
                        fontWeight: 700,
                      }}
                      className={`absolute px-2 py-0.5 rounded font-bold pointer-events-none transition-all duration-150 ${getPositionClasses()} ${
                        bgColor === 'transparent'
                          ? 'border border-dashed border-primary/50 bg-primary/5 backdrop-blur-[1px]'
                          : 'shadow-md border'
                      }`}
                    >
                      {getSampleText(currentPage)}
                    </div>
                  )}
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
                      <img src={pg.dataUrl} alt={`P${pg.pageNumber}`} className="w-full h-auto rounded-none object-contain bg-white" />
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
                <div className="space-y-3.5 p-4 rounded-2xl bg-base-200/40 border border-base-300">
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

                  {/* Font Size with Plus / Minus buttons and Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-base-content/70">
                      <span className="font-medium">Font Size</span>
                      <span className="font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                        {fontSize}pt
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFontSize((prev) => Math.max(6, prev - 1))}
                        className="btn btn-xs btn-outline border-base-300 rounded-lg w-8 h-8 p-0 text-base font-bold shrink-0 hover:bg-base-200"
                        title="Decrease font size (-1)"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="range"
                        min="6"
                        max="32"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value) || 10)}
                        className="range range-xs range-primary flex-1 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setFontSize((prev) => Math.min(36, prev + 1))}
                        className="btn btn-xs btn-outline border-base-300 rounded-lg w-8 h-8 p-0 text-base font-bold shrink-0 hover:bg-base-200"
                        title="Increase font size (+1)"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 1 Row 2 Columns: 1. Change Font Color and 2. Change Background Color */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* 1. Change Font Color */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-base-content/70 font-medium flex items-center justify-between">
                        <span>Font Color</span>
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-base-300 shadow-2xs shrink-0"
                          style={{ backgroundColor: fontColor }}
                        />
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={fontColor}
                          onChange={(e) => setFontColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-base-300 p-0.5 bg-base-100 shrink-0"
                          title="Custom font color picker"
                        />
                        <select
                          value={fontColor}
                          onChange={(e) => setFontColor(e.target.value)}
                          className="select select-bordered select-xs w-full rounded-xl text-xs font-medium"
                        >
                          <option value="#000000">Black</option>
                          <option value="#374151">Dark Gray</option>
                          <option value="#ffffff">White</option>
                          <option value="#2563eb">Blue</option>
                          <option value="#dc2626">Red</option>
                          <option value="#16a34a">Green</option>
                        </select>
                      </div>
                    </div>

                    {/* 2. Change Background Color */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-base-content/70 font-medium flex items-center justify-between">
                        <span>Background Color</span>
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-base-300 shadow-2xs shrink-0"
                          style={{ backgroundColor: bgColor === 'transparent' ? '#ffffff' : bgColor }}
                        />
                      </label>
                      <div className="flex items-center gap-1.5">
                        {bgColor !== 'transparent' ? (
                          <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-base-300 p-0.5 bg-base-100 shrink-0"
                            title="Custom background color picker"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-lg border border-dashed border-base-300 flex items-center justify-center shrink-0 text-xs text-base-content/40 font-mono"
                            title="Transparent background"
                          >
                            Ø
                          </div>
                        )}
                        <select
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="select select-bordered select-xs w-full rounded-xl text-xs font-medium"
                        >
                          <option value="transparent">Transparent (None)</option>
                          <option value="#ffffff">White Badge</option>
                          <option value="#000000">Black Badge</option>
                          <option value="#2563eb">Blue Badge</option>
                          <option value="#f1f5f9">Light Gray</option>
                          <option value="#fef08a">Yellow Highlight</option>
                        </select>
                      </div>
                    </div>
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
                      <span className="loading loading-spinner loading-xs" />
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
        <ResultCard
          newSize={resultData.size}
          originalSize={file?.size || resultData.size}
          filename={resultData.filename}
          dataUrl={resultData.dataUrl}
          format="PDF"
          title="Your PDF has been numbered successfully!"
          subtitle="Page numbers have been added to your document. You can now download your file below."
          resetLabel="Number Another PDF"
          extraInfo={pages.length > 0 ? `${pages.length} Pages` : undefined}
          pageCount={pages.length}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
