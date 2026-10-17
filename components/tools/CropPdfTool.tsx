'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  Download,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Eye,
  FileText,
  Sliders,
  Files,
  File,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { extractPdfThumbnails, PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';
import { PDFDocument } from 'pdf-lib';

type DragHandle =
  | 'draw'
  | 'move'
  | 'nw'
  | 'ne'
  | 'se'
  | 'sw'
  | 'n'
  | 's'
  | 'e'
  | 'w';

interface CropMargins {
  top: number;     // 0 - 45%
  bottom: number;  // 0 - 45%
  left: number;    // 0 - 45%
  right: number;   // 0 - 45%
}

export default function CropPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageThumbnail[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loadingThumbnails, setLoadingThumbnails] = useState<boolean>(false);

  // Scope: 'all' = apply to every page, 'current' = apply only to active page
  const [cropScope, setCropScope] = useState<'all' | 'current'>('all');

  // Active margins (percentages 0% to 45%)
  const [topMargin, setTopMargin] = useState<number>(8);
  const [bottomMargin, setBottomMargin] = useState<number>(8);
  const [leftMargin, setLeftMargin] = useState<number>(8);
  const [rightMargin, setRightMargin] = useState<number>(8);

  // Per-page crop storage for 'current' mode
  const [pageCrops, setPageCrops] = useState<Record<number, CropMargins>>({});

  // Active preset tracking
  const [activePreset, setActivePreset] = useState<string>('standard');

  // Processing state
  const [processing, setProcessing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Drag interaction refs
  const previewRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    initLeft: number;
    initRight: number;
    initTop: number;
    initBottom: number;
  } | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Save current margins to pageCrops if in 'current' mode
  const saveCurrentPageMargins = useCallback(
    (page: number, margins: CropMargins) => {
      setPageCrops((prev) => ({
        ...prev,
        [page]: margins,
      }));
    },
    []
  );

  // Whenever margins change and we're in 'current' mode, persist for this page
  useEffect(() => {
    if (cropScope === 'current') {
      saveCurrentPageMargins(currentPage, {
        top: topMargin,
        bottom: bottomMargin,
        left: leftMargin,
        right: rightMargin,
      });
    }
  }, [topMargin, bottomMargin, leftMargin, rightMargin, cropScope, currentPage, saveCurrentPageMargins]);

  // Page change handler
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pages.length) return;

    if (cropScope === 'current') {
      // Save outgoing page
      saveCurrentPageMargins(currentPage, {
        top: topMargin,
        bottom: bottomMargin,
        left: leftMargin,
        right: rightMargin,
      });

      // Load incoming page crop or keep current
      const nextMargins = pageCrops[newPage] || {
        top: topMargin,
        bottom: bottomMargin,
        left: leftMargin,
        right: rightMargin,
      };
      setTopMargin(nextMargins.top);
      setBottomMargin(nextMargins.bottom);
      setLeftMargin(nextMargins.left);
      setRightMargin(nextMargins.right);
    }

    setCurrentPage(newPage);
  };

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResultData(null);
    setLoadingThumbnails(true);
    setPageCrops({});
    setTopMargin(8);
    setBottomMargin(8);
    setLeftMargin(8);
    setRightMargin(8);
    setActivePreset('standard');

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

  const handleApplyPreset = (preset: 'none' | 'light' | 'standard' | 'heavy' | 'header-footer' | 'sides') => {
    setActivePreset(preset);
    let t = 0, b = 0, l = 0, r = 0;
    if (preset === 'none') {
      t = 0; b = 0; l = 0; r = 0;
    } else if (preset === 'light') {
      t = 4; b = 4; l = 4; r = 4;
    } else if (preset === 'standard') {
      t = 8; b = 8; l = 8; r = 8;
    } else if (preset === 'heavy') {
      t = 15; b = 15; l = 15; r = 15;
    } else if (preset === 'header-footer') {
      t = 14; b = 14; l = 3; r = 3;
    } else if (preset === 'sides') {
      t = 3; b = 3; l = 14; r = 14;
    }

    setTopMargin(t);
    setBottomMargin(b);
    setLeftMargin(l);
    setRightMargin(r);
  };

  // ---------------------------------------------------------------------------
  // Unified Pointer (Mouse + Touch) Drag Handling
  // ---------------------------------------------------------------------------
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    handle: DragHandle
  ) => {
    if (!previewRef.current) return;
    e.stopPropagation();
    e.preventDefault();

    const rect = previewRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    dragInfo.current = {
      handle,
      startX: xPct,
      startY: yPct,
      initLeft: leftMargin,
      initRight: rightMargin,
      initTop: topMargin,
      initBottom: bottomMargin,
    };
    setIsDragging(true);
    setActivePreset('');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfo.current || !previewRef.current) return;
    e.preventDefault();

    const rect = previewRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const { handle, startX, startY, initLeft, initRight, initTop, initBottom } = dragInfo.current;
    const MIN_SIZE = 8; // minimum 8% box width/height

    if (handle === 'draw') {
      // User is clicking and dragging on the preview to create/draw a new box
      const left = Math.max(0, Math.min(startX, xPct));
      const right = Math.max(0, 100 - Math.max(startX, xPct));
      const top = Math.max(0, Math.min(startY, yPct));
      const bottom = Math.max(0, 100 - Math.max(startY, yPct));

      if (100 - left - right >= MIN_SIZE) {
        setLeftMargin(Math.round(left));
        setRightMargin(Math.round(right));
      }
      if (100 - top - bottom >= MIN_SIZE) {
        setTopMargin(Math.round(top));
        setBottomMargin(Math.round(bottom));
      }
      return;
    }

    const dx = xPct - startX;
    const dy = yPct - startY;

    if (handle === 'move') {
      // Moving the entire box
      const boxW = 100 - initLeft - initRight;
      const boxH = 100 - initTop - initBottom;

      let newLeft = initLeft + dx;
      let newTop = initTop + dy;

      newLeft = Math.max(0, Math.min(100 - boxW, newLeft));
      newTop = Math.max(0, Math.min(100 - boxH, newTop));

      const newRight = 100 - newLeft - boxW;
      const newBottom = 100 - newTop - boxH;

      setLeftMargin(Math.round(newLeft));
      setRightMargin(Math.round(newRight));
      setTopMargin(Math.round(newTop));
      setBottomMargin(Math.round(newBottom));
      return;
    }

    // Handles
    if (handle === 'nw' || handle === 'w' || handle === 'sw') {
      const maxLeft = 100 - initRight - MIN_SIZE;
      const newLeft = Math.max(0, Math.min(maxLeft, initLeft + dx));
      setLeftMargin(Math.round(newLeft));
    }

    if (handle === 'ne' || handle === 'e' || handle === 'se') {
      const maxRight = 100 - initLeft - MIN_SIZE;
      const newRight = Math.max(0, Math.min(maxRight, initRight - dx));
      setRightMargin(Math.round(newRight));
    }

    if (handle === 'nw' || handle === 'n' || handle === 'ne') {
      const maxTop = 100 - initBottom - MIN_SIZE;
      const newTop = Math.max(0, Math.min(maxTop, initTop + dy));
      setTopMargin(Math.round(newTop));
    }

    if (handle === 'sw' || handle === 's' || handle === 'se') {
      const maxBottom = 100 - initTop - MIN_SIZE;
      const newBottom = Math.max(0, Math.min(maxBottom, initBottom - dy));
      setBottomMargin(Math.round(newBottom));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragInfo.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      dragInfo.current = null;
      setIsDragging(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PDF-lib Crop Execution
  // ---------------------------------------------------------------------------
  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pdfPages = pdfDoc.getPages();

      for (let i = 0; i < pdfPages.length; i++) {
        const pageNum = i + 1;
        const page = pdfPages[i];
        const { width, height } = page.getSize();

        // Determine margins for this page based on scope
        let margins: CropMargins;
        if (cropScope === 'all') {
          margins = { top: topMargin, bottom: bottomMargin, left: leftMargin, right: rightMargin };
        } else {
          // 'current' mode: only crop if it's the current page or explicitly customized
          if (pageNum === currentPage) {
            margins = { top: topMargin, bottom: bottomMargin, left: leftMargin, right: rightMargin };
          } else if (pageCrops[pageNum]) {
            margins = pageCrops[pageNum];
          } else {
            // Keep original page untouched
            continue;
          }
        }

        // Account for page orientation rotation in pdf-lib
        const rotationAngle = (page.getRotation().angle || 0) % 360;

        let leftPct = margins.left;
        let rightPct = margins.right;
        let topPct = margins.top;
        let bottomPct = margins.bottom;

        // Map visual top/bottom/left/right to PDF coordinates considering rotation
        let effLeft = leftPct;
        let effRight = rightPct;
        let effTop = topPct;
        let effBottom = bottomPct;

        if (rotationAngle === 90) {
          effLeft = bottomPct;
          effRight = topPct;
          effTop = leftPct;
          effBottom = rightPct;
        } else if (rotationAngle === 180) {
          effLeft = rightPct;
          effRight = leftPct;
          effTop = bottomPct;
          effBottom = topPct;
        } else if (rotationAngle === 270) {
          effLeft = topPct;
          effRight = bottomPct;
          effTop = rightPct;
          effBottom = leftPct;
        }

        const leftPts = (effLeft / 100) * width;
        const rightPts = (effRight / 100) * width;
        const topPts = (effTop / 100) * height;
        const bottomPts = (effBottom / 100) * height;

        const newX = leftPts;
        const newY = bottomPts;
        const newWidth = Math.max(30, width - leftPts - rightPts);
        const newHeight = Math.max(30, height - topPts - bottomPts);

        page.setCropBox(newX, newY, newWidth, newHeight);
      }

      const croppedBytes = await pdfDoc.save();
      const blob = new Blob([croppedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const dataUrl = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      setResultData({
        dataUrl,
        filename: `${baseName}_cropped.pdf`,
        size: blob.size,
      });
    } catch (err: any) {
      console.error('Crop processing failed:', err);
      setError(err.message || 'Failed to crop PDF document. Please try again.');
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
    setPageCrops({});
    setCropScope('all');
  };

  const activeThumbnail = pages[currentPage - 1];

  const cropBoxWidth = 100 - leftMargin - rightMargin;
  const cropBoxHeight = 100 - topMargin - bottomMargin;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Upload Zone */}
      {(!file || loadingThumbnails) && (
        <UploadZone
          accept=".pdf,application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title="Upload PDF to Crop & Trim Margins"
          subtitle="Select with your mouse or finger, trim margins, remove headers/footers, and choose to apply to one or all pages."
          onFilesSelected={(files) => handleFileSelected(files[0])}
          loading={loadingThumbnails}
          loadingMessage="Generating visual page previews & initializing crop studio..."
          files={file ? [file] : []}
        />
      )}

      {/* Main Studio */}
      {file && !loadingThumbnails && !resultData && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Crop className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-base-content truncate max-w-[200px] sm:max-w-md">
                  {file.name}
                </h3>
                <p className="text-xs text-base-content/60">
                  {formatBytes(file.size)} • {pages.length} Page{pages.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="btn btn-ghost btn-sm btn-circle"
              title="Upload another document"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Interactive Visual Viewport with Direct Mouse & Touch Selection */}
            <div className="lg:col-span-7 flex flex-col items-center bg-base-200/50 p-4 sm:p-6 rounded-3xl border border-base-300 space-y-3">
              {/* Toolbar above preview */}
              <div className="w-full flex items-center justify-between text-xs font-semibold text-base-content/75 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Page {currentPage} of {pages.length || 1}</span>
                  </span>
                  {cropScope === 'current' && (
                    <span className="badge badge-xs badge-secondary text-[10px]">
                      Single Page Mode
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="hidden sm:inline text-[11px] text-base-content/50">
                    Kept: {Math.round(cropBoxWidth)}% × {Math.round(cropBoxHeight)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('none')}
                    className="btn btn-ghost btn-xs text-[11px] gap-1 hover:bg-base-200"
                    title="Reset to full page"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Full Page</span>
                  </button>
                </div>
              </div>

              {/* Interactive Crop Canvas */}
              {activeThumbnail ? (
                <div
                  ref={previewRef}
                  onPointerDown={(e) => handlePointerDown(e, 'draw')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    aspectRatio: `${activeThumbnail.aspectRatio}`,
                    touchAction: 'none',
                  }}
                  className={`relative w-full max-w-[340px] sm:max-w-[420px] bg-white rounded-2xl shadow-xl overflow-hidden border border-base-300 select-none my-1 cursor-crosshair ${
                    isDragging ? 'select-none' : ''
                  }`}
                >
                  {/* Base Page Image */}
                  <img
                    src={activeThumbnail.dataUrl}
                    alt={`Page ${currentPage}`}
                    draggable={false}
                    className="w-full h-full object-contain pointer-events-none block"
                  />

                  {/* Shaded Trim Areas (Dimmed backdrop over areas to be trimmed) */}
                  {/* Top */}
                  <div
                    style={{ top: 0, left: 0, right: 0, height: `${topMargin}%` }}
                    className="absolute bg-slate-900/50 backdrop-blur-[0.5px] border-b border-red-500/40 pointer-events-none transition-none"
                  />
                  {/* Bottom */}
                  <div
                    style={{ bottom: 0, left: 0, right: 0, height: `${bottomMargin}%` }}
                    className="absolute bg-slate-900/50 backdrop-blur-[0.5px] border-t border-red-500/40 pointer-events-none transition-none"
                  />
                  {/* Left */}
                  <div
                    style={{
                      top: `${topMargin}%`,
                      bottom: `${bottomMargin}%`,
                      left: 0,
                      width: `${leftMargin}%`,
                    }}
                    className="absolute bg-slate-900/50 backdrop-blur-[0.5px] border-r border-red-500/40 pointer-events-none transition-none"
                  />
                  {/* Right */}
                  <div
                    style={{
                      top: `${topMargin}%`,
                      bottom: `${bottomMargin}%`,
                      right: 0,
                      width: `${rightMargin}%`,
                    }}
                    className="absolute bg-slate-900/50 backdrop-blur-[0.5px] border-l border-red-500/40 pointer-events-none transition-none"
                  />

                  {/* ACTIVE CROP BOX (Interactive draggable & resizable) */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'move')}
                    style={{
                      top: `${topMargin}%`,
                      bottom: `${bottomMargin}%`,
                      left: `${leftMargin}%`,
                      right: `${rightMargin}%`,
                    }}
                    className="absolute border-2 border-emerald-500 bg-emerald-500/5 shadow-2xl cursor-move transition-none"
                  >
                    {/* Size badge inside box */}
                    <div className="absolute top-1.5 left-1.5 pointer-events-none">
                      <span className="badge badge-xs bg-emerald-600 text-white font-bold text-[9px] px-1.5 py-0.5 shadow">
                        Crop Area
                      </span>
                    </div>

                    {/* Corner Handles (with generous touch-target areas for mobile) */}
                    {/* Top-Left */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'nw')}
                      className="absolute -top-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-20 touch-none"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md" />
                    </div>

                    {/* Top-Right */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'ne')}
                      className="absolute -top-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-20 touch-none"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md" />
                    </div>

                    {/* Bottom-Right */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'se')}
                      className="absolute -bottom-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-20 touch-none"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md" />
                    </div>

                    {/* Bottom-Left */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'sw')}
                      className="absolute -bottom-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-20 touch-none"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md" />
                    </div>

                    {/* Mid-Edge Handles */}
                    {/* Top */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'n')}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-6 flex items-center justify-center cursor-ns-resize z-10 touch-none"
                    >
                      <div className="w-5 h-1.5 bg-white border border-emerald-600 rounded-full shadow" />
                    </div>

                    {/* Bottom */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 's')}
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-6 flex items-center justify-center cursor-ns-resize z-10 touch-none"
                    >
                      <div className="w-5 h-1.5 bg-white border border-emerald-600 rounded-full shadow" />
                    </div>

                    {/* Left */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'w')}
                      className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-8 flex items-center justify-center cursor-ew-resize z-10 touch-none"
                    >
                      <div className="w-1.5 h-5 bg-white border border-emerald-600 rounded-full shadow" />
                    </div>

                    {/* Right */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'e')}
                      className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-8 flex items-center justify-center cursor-ew-resize z-10 touch-none"
                    >
                      <div className="w-1.5 h-5 bg-white border border-emerald-600 rounded-full shadow" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-64 bg-base-100 rounded-2xl border border-dashed border-base-300 flex flex-col items-center justify-center text-xs text-base-content/50">
                  <FileText className="w-8 h-8 opacity-40 mb-2" />
                  PDF Ready to Crop
                </div>
              )}

              {/* Interaction Hint */}
              <div className="text-[11px] text-base-content/60 text-center flex items-center gap-1.5">
                <span className="hidden sm:inline">🖱️ Click & drag anywhere to draw a crop box, or drag the edges and center.</span>
                <span className="sm:hidden">👆 Touch & drag to select or adjust your crop area.</span>
              </div>

              {/* Page Navigator & Thumbnails Strip */}
              {pages.length > 1 && (
                <div className="w-full pt-2 border-t border-base-300 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="btn btn-ghost btn-xs gap-1 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="text-[11px] font-bold text-base-content/70">
                      Page {currentPage} of {pages.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= pages.length}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="btn btn-ghost btn-xs gap-1 disabled:opacity-30"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail Carousel */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {pages.map((pg) => {
                      const hasCustom = Boolean(pageCrops[pg.pageNumber]);
                      return (
                        <button
                          key={pg.pageNumber}
                          type="button"
                          onClick={() => handlePageChange(pg.pageNumber)}
                          className={`relative shrink-0 w-12 sm:w-14 rounded-xl p-1 border-2 transition-all ${
                            currentPage === pg.pageNumber
                              ? 'border-primary bg-primary/10 shadow-sm scale-105'
                              : 'border-base-300 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={pg.dataUrl}
                            alt={`P${pg.pageNumber}`}
                            className="w-full h-auto rounded-lg object-contain bg-white"
                          />
                          <span className="block text-[9px] font-bold text-center mt-0.5">
                            {pg.pageNumber}
                          </span>
                          {hasCustom && cropScope === 'current' && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-secondary rounded-full border border-base-100" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Controls & Options */}
            <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* 1. REQUIRED FEATURE: Apply Crop Scope (All vs Current Page) */}
                <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-sm space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center justify-between">
                    <span>Apply Crop To</span>
                    <span className="badge badge-sm badge-primary text-[10px] font-bold">
                      {cropScope === 'all' ? `All ${pages.length} Pages` : `Page ${currentPage} Only`}
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-2 p-1 bg-base-200/80 rounded-2xl border border-base-300">
                    <button
                      type="button"
                      onClick={() => setCropScope('all')}
                      className={`btn btn-sm rounded-xl text-xs font-bold gap-1.5 transition-all ${
                        cropScope === 'all'
                          ? 'btn-primary shadow-sm'
                          : 'btn-ghost text-base-content/70 hover:text-base-content'
                      }`}
                    >
                      <Files className="w-4 h-4" />
                      <span>All Pages</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropScope('current')}
                      className={`btn btn-sm rounded-xl text-xs font-bold gap-1.5 transition-all ${
                        cropScope === 'current'
                          ? 'btn-primary shadow-sm'
                          : 'btn-ghost text-base-content/70 hover:text-base-content'
                      }`}
                    >
                      <File className="w-4 h-4" />
                      <span>Current Page</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-base-content/55">
                    {cropScope === 'all'
                      ? 'The selected crop area will be applied uniformly across every page.'
                      : `Only page ${currentPage} will be cropped; other pages remain full size.`}
                  </p>
                </div>

                {/* 2. Quick Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                    Quick Crop Presets
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('light')}
                      className={`btn btn-xs sm:btn-sm rounded-xl text-xs font-semibold ${
                        activePreset === 'light' ? 'btn-primary' : 'btn-outline'
                      }`}
                    >
                      Light (4%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('standard')}
                      className={`btn btn-xs sm:btn-sm rounded-xl text-xs font-semibold ${
                        activePreset === 'standard' ? 'btn-primary' : 'btn-outline'
                      }`}
                    >
                      Standard (8%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('heavy')}
                      className={`btn btn-xs sm:btn-sm rounded-xl text-xs font-semibold ${
                        activePreset === 'heavy' ? 'btn-primary' : 'btn-outline'
                      }`}
                    >
                      Deep (15%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('header-footer')}
                      className={`btn btn-xs sm:btn-sm rounded-xl text-xs font-semibold ${
                        activePreset === 'header-footer' ? 'btn-primary' : 'btn-outline'
                      }`}
                    >
                      Header/Footer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('sides')}
                      className={`btn btn-xs sm:btn-sm rounded-xl text-xs font-semibold ${
                        activePreset === 'sides' ? 'btn-primary' : 'btn-outline'
                      }`}
                    >
                      Side Margins
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('none')}
                      className={`btn btn-xs sm:btn-sm rounded-xl text-xs font-semibold ${
                        activePreset === 'none' ? 'btn-primary' : 'btn-outline'
                      }`}
                    >
                      Whole Page
                    </button>
                  </div>
                </div>

                {/* 3. Manual Toggles & Margin Sliders */}
                <div className="space-y-3 p-4 rounded-2xl bg-base-200/40 border border-base-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      Precise Margin Trimming (%)
                    </span>
                  </div>

                  {/* Top Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-base-content/70">
                      <span>Top Margin</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTopMargin((v) => Math.max(0, v - 1))}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-bold text-primary w-8 text-center">{topMargin}%</span>
                        <button
                          type="button"
                          onClick={() => setTopMargin((v) => Math.min(45, v + 1))}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={topMargin}
                      onChange={(e) => {
                        setTopMargin(parseInt(e.target.value) || 0);
                        setActivePreset('');
                      }}
                      className="range range-xs range-primary"
                    />
                  </div>

                  {/* Bottom Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-base-content/70">
                      <span>Bottom Margin</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setBottomMargin((v) => Math.max(0, v - 1))}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-bold text-primary w-8 text-center">{bottomMargin}%</span>
                        <button
                          type="button"
                          onClick={() => setBottomMargin((v) => Math.min(45, v + 1))}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={bottomMargin}
                      onChange={(e) => {
                        setBottomMargin(parseInt(e.target.value) || 0);
                        setActivePreset('');
                      }}
                      className="range range-xs range-primary"
                    />
                  </div>

                  {/* Left Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-base-content/70">
                      <span>Left Margin</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setLeftMargin((v) => Math.max(0, v - 1))}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-bold text-primary w-8 text-center">{leftMargin}%</span>
                        <button
                          type="button"
                          onClick={() => setLeftMargin((v) => Math.min(45, v + 1))}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={leftMargin}
                      onChange={(e) => {
                        setLeftMargin(parseInt(e.target.value) || 0);
                        setActivePreset('');
                      }}
                      className="range range-xs range-primary"
                    />
                  </div>

                  {/* Right Margin */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-base-content/70">
                      <span>Right Margin</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setRightMargin((v) => Math.max(0, v - 1))}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-bold text-primary w-8 text-center">{rightMargin}%</span>
                        <button
                          type="button"
                          onClick={() => setRightMargin((v) => Math.min(45, v + 1))}
                          className="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={rightMargin}
                      onChange={(e) => {
                        setRightMargin(parseInt(e.target.value) || 0);
                        setActivePreset('');
                      }}
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

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={processing}
                  className="btn btn-primary w-full rounded-2xl gap-2 shadow-lg shadow-primary/25 font-bold text-sm"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cropping PDF Pages...</span>
                    </>
                  ) : (
                    <>
                      <Crop className="w-4 h-4" />
                      <span>
                        {cropScope === 'all'
                          ? `Crop All ${pages.length} Pages`
                          : `Crop Page ${currentPage} Only`}
                      </span>
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
        <ResultCard
          newSize={resultData.size}
          originalSize={file?.size || resultData.size}
          filename={resultData.filename}
          dataUrl={resultData.dataUrl}
          format="PDF"
          title="Your PDF has been cropped successfully!"
          subtitle={
            cropScope === 'all'
              ? `All ${pages.length} pages were cropped according to your selection.`
              : `Page ${currentPage} was cropped according to your selection.`
          }
          resetLabel="Crop Another Document"
          extraInfo={pages.length > 0 ? `${pages.length} Pages` : undefined}
          pageCount={pages.length}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
