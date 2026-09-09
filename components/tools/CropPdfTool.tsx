'use client';

import React, { useState } from 'react';
import { Crop, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, Eye, FileText, Sliders } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails, PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';

export default function CropPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageThumbnail[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loadingThumbnails, setLoadingThumbnails] = useState<boolean>(false);

  // Margin crop settings (in pixels / points)
  const [topMargin, setTopMargin] = useState<number>(30);
  const [bottomMargin, setBottomMargin] = useState<number>(30);
  const [leftMargin, setLeftMargin] = useState<number>(30);
  const [rightMargin, setRightMargin] = useState<number>(30);

  // Processing state
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
      setError('Could not extract PDF page thumbnails. You can still crop the file.');
    } finally {
      setLoadingThumbnails(false);
    }
  };

  const handleApplyPreset = (preset: 'light' | 'standard' | 'heavy' | 'header-footer') => {
    if (preset === 'light') {
      setTopMargin(20);
      setBottomMargin(20);
      setLeftMargin(20);
      setRightMargin(20);
    } else if (preset === 'standard') {
      setTopMargin(40);
      setBottomMargin(40);
      setLeftMargin(40);
      setRightMargin(40);
    } else if (preset === 'heavy') {
      setTopMargin(60);
      setBottomMargin(60);
      setLeftMargin(60);
      setRightMargin(60);
    } else if (preset === 'header-footer') {
      setTopMargin(60);
      setBottomMargin(60);
      setLeftMargin(15);
      setRightMargin(15);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'crop');
      formData.append('top', topMargin.toString());
      formData.append('bottom', bottomMargin.toString());
      formData.append('left', leftMargin.toString());
      formData.append('right', rightMargin.toString());

      const res = await fetch('/api/flatten-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to crop PDF.');
      }

      setResultData({
        dataUrl: data.dataUrl,
        filename: data.filename,
        size: data.size,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error cropping PDF.');
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

  const activeThumbnail = pages[currentPage - 1];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {!file && (
        <UploadZone
          accept="application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title="Upload PDF to Crop & Trim Margins"
          subtitle="Visually trim page margins, remove headers/footers, or crop PDF document boundaries."
          onFilesSelected={(files) => handleFileSelected(files[0])}
        />
      )}

      {loadingThumbnails && (
        <div className="py-12 text-center space-y-4">
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
          <h3 className="font-bold text-base">Generating Visual Page Previews...</h3>
          <p className="text-xs text-base-content/60">Rendering document pages for visual crop studio</p>
        </div>
      )}

      {file && !loadingThumbnails && !resultData && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Crop className="w-5 h-5" />
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
            {/* Left: Interactive Visual Page Preview with Live Crop Overlay */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-base-200/50 p-4 sm:p-6 rounded-2xl border border-base-300">
              <div className="w-full flex items-center justify-between pb-3 text-xs font-bold text-base-content/70">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  Live Crop Preview (Page {currentPage} of {pages.length || 1})
                </span>
                <span className="text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Green box shows kept content
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

                  {/* Visual Shaded Margin Cutout (Red/Dark trimmed areas) */}
                  <div
                    style={{
                      top: 0,
                      left: 0,
                      right: 0,
                      height: `${Math.min(topMargin * 0.4, 40)}%`,
                    }}
                    className="absolute bg-red-500/20 backdrop-blur-[0.5px] border-b border-red-500/50 pointer-events-none transition-all"
                  />
                  <div
                    style={{
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${Math.min(bottomMargin * 0.4, 40)}%`,
                    }}
                    className="absolute bg-red-500/20 backdrop-blur-[0.5px] border-t border-red-500/50 pointer-events-none transition-all"
                  />
                  <div
                    style={{
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: `${Math.min(leftMargin * 0.4, 40)}%`,
                    }}
                    className="absolute bg-red-500/20 backdrop-blur-[0.5px] border-r border-red-500/50 pointer-events-none transition-all"
                  />
                  <div
                    style={{
                      top: 0,
                      bottom: 0,
                      right: 0,
                      width: `${Math.min(rightMargin * 0.4, 40)}%`,
                    }}
                    className="absolute bg-red-500/20 backdrop-blur-[0.5px] border-l border-red-500/50 pointer-events-none transition-all"
                  />

                  {/* Active Crop Box (Green border around remaining content) */}
                  <div
                    style={{
                      top: `${Math.min(topMargin * 0.4, 40)}%`,
                      bottom: `${Math.min(bottomMargin * 0.4, 40)}%`,
                      left: `${Math.min(leftMargin * 0.4, 40)}%`,
                      right: `${Math.min(rightMargin * 0.4, 40)}%`,
                    }}
                    className="absolute border-2 border-dashed border-emerald-500 rounded pointer-events-none shadow-sm transition-all"
                  />
                </div>
              ) : (
                <div className="w-full h-64 bg-base-100 rounded-xl border border-dashed border-base-300 flex items-center justify-center text-xs text-base-content/50">
                  <FileText className="w-8 h-8 opacity-40 mb-2 block" />
                  PDF Ready to Crop
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

            {/* Right: Crop Controls & Sliders */}
            <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                    Quick Margin Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('light')}
                      className="btn btn-sm btn-outline rounded-xl text-xs font-semibold"
                    >
                      Light Trim (20px)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('standard')}
                      className="btn btn-sm btn-outline rounded-xl text-xs font-semibold"
                    >
                      Standard (40px)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('heavy')}
                      className="btn btn-sm btn-outline rounded-xl text-xs font-semibold"
                    >
                      Deep Crop (60px)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('header-footer')}
                      className="btn btn-sm btn-outline rounded-xl text-xs font-semibold"
                    >
                      Trim Top/Bottom
                    </button>
                  </div>
                </div>

                {/* Individual Margin Sliders */}
                <div className="space-y-3 p-4 rounded-2xl bg-base-200/40 border border-base-300">
                  <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    Custom Margin Trimming (px)
                  </span>

                  {/* Top Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-base-content/70">
                      <span>Top Margin</span>
                      <span className="font-bold text-primary">{topMargin}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={topMargin}
                      onChange={(e) => setTopMargin(parseInt(e.target.value) || 0)}
                      className="range range-xs range-primary"
                    />
                  </div>

                  {/* Bottom Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-base-content/70">
                      <span>Bottom Margin</span>
                      <span className="font-bold text-primary">{bottomMargin}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bottomMargin}
                      onChange={(e) => setBottomMargin(parseInt(e.target.value) || 0)}
                      className="range range-xs range-primary"
                    />
                  </div>

                  {/* Left Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-base-content/70">
                      <span>Left Margin</span>
                      <span className="font-bold text-primary">{leftMargin}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={leftMargin}
                      onChange={(e) => setLeftMargin(parseInt(e.target.value) || 0)}
                      className="range range-xs range-primary"
                    />
                  </div>

                  {/* Right Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-base-content/70">
                      <span>Right Margin</span>
                      <span className="font-bold text-primary">{rightMargin}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={rightMargin}
                      onChange={(e) => setRightMargin(parseInt(e.target.value) || 0)}
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
                      <span>Cropping PDF Pages...</span>
                    </>
                  ) : (
                    <>
                      <Crop className="w-4 h-4" />
                      <span>Crop PDF Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Screen */}
      {resultData && (
        <div className="py-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold text-base-content">PDF Successfully Cropped!</h3>
            <p className="text-xs text-base-content/60">{formatBytes(resultData.size)}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={resultData.dataUrl}
              download={resultData.filename}
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/25 font-bold"
            >
              <Download className="w-4 h-4" />
              <span>Download Cropped PDF</span>
            </a>
            <button onClick={handleReset} className="btn btn-ghost text-xs">
              Crop Another Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
