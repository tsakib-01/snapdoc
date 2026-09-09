'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  RotateCw,
  Trash2,
  CheckSquare,
  Square,
  ZoomIn,
  Download,
  Loader2,
  FileText,
  Plus,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Maximize2,
  X,
  Layers,
  Scissors,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails, PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';

export interface VisualPageItem {
  id: string;
  originalIndex: number; // 0-based
  pageNumber: number; // 1-based display
  dataUrl: string;
  rotation: number; // 0, 90, 180, 270
  selected: boolean;
  aspectRatio: number;
}

interface VisualPdfOrganizerToolProps {
  initialMode?: 'organize' | 'extract' | 'delete' | 'rotate' | 'split';
  title?: string;
  description?: string;
}

export default function VisualPdfOrganizerTool({
  initialMode = 'organize',
  title = 'Visual PDF Page Organizer',
  description = 'Organize, reorder, rotate, delete, and extract PDF pages visually with live thumbnail previews.',
}: VisualPdfOrganizerToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<VisualPageItem[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState({ loaded: 0, total: 0 });
  const [mode, setMode] = useState<'extract' | 'split' | 'delete' | 'rotate'>(
    initialMode === 'delete' ? 'delete' : initialMode === 'rotate' ? 'rotate' : 'extract'
  );
  const [separatePdfs, setSeparatePdfs] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
    mimeType: string;
    pageCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomPage, setZoomPage] = useState<VisualPageItem | null>(null);

  // When a file is uploaded, extract thumbnails
  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResultData(null);
    setLoadingThumbnails(true);
    setThumbnailProgress({ loaded: 0, total: 0 });

    try {
      const { thumbnails, pageCount } = await extractPdfThumbnails(selectedFile, {
        onProgress: (loaded, total) => {
          setThumbnailProgress({ loaded, total });
        },
      });

      const initialPages: VisualPageItem[] = thumbnails.map((thumb, idx) => ({
        id: `page-${idx}-${Date.now()}`,
        originalIndex: idx,
        pageNumber: idx + 1,
        dataUrl: thumb.dataUrl,
        rotation: 0,
        selected: initialMode === 'delete' ? false : true, // default select all for extract/organize
        aspectRatio: thumb.aspectRatio,
      }));

      setPages(initialPages);
    } catch (err: any) {
      console.error('Thumbnail error:', err);
      setError('Could not render PDF pages. Please ensure the file is a valid, unencrypted PDF.');
    } finally {
      setLoadingThumbnails(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPages([]);
    setResultData(null);
    setError(null);
  };

  // Toggle selection
  const toggleSelectPage = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAll = (select: boolean) => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: select })));
  };

  const selectOdd = () => {
    setPages((prev) =>
      prev.map((p, idx) => ({ ...p, selected: idx % 2 === 0 }))
    );
  };

  const selectEven = () => {
    setPages((prev) =>
      prev.map((p, idx) => ({ ...p, selected: idx % 2 === 1 }))
    );
  };

  // Rotate single page
  const rotatePage = (id: string, angleDelta: number) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextRot = (p.rotation + angleDelta + 360) % 360;
          return { ...p, rotation: nextRot };
        }
        return p;
      })
    );
  };

  // Rotate selected or all pages
  const rotateSelected = (angleDelta: number) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.selected) {
          return { ...p, rotation: (p.rotation + angleDelta + 360) % 360 };
        }
        return p;
      })
    );
  };

  // Delete single page from workspace
  const deletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  // Delete all currently selected pages
  const deleteSelected = () => {
    setPages((prev) => prev.filter((p) => !p.selected));
  };

  // Move page left/right
  const movePage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    setPages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const selectedCount = pages.filter((p) => p.selected).length;
  const allSelected = pages.length > 0 && selectedCount === pages.length;

  // Execute processing
  const handleProcess = async () => {
    if (!file) return;

    const pagesToInclude = pages
      .filter((p) => (initialMode === 'delete' ? !p.selected : p.selected))
      .map((p) => ({
        pageIndex: p.originalIndex,
        rotation: p.rotation,
      }));

    if (pagesToInclude.length === 0) {
      setError('Please select at least 1 page to include in the output PDF.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pages', JSON.stringify(pagesToInclude));
      formData.append('separateFiles', separatePdfs ? 'true' : 'false');

      const res = await fetch('/api/organize-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to process PDF.');
      }

      setResultData({
        dataUrl: data.dataUrl,
        filename: data.filename,
        size: data.size,
        mimeType: data.mimeType,
        pageCount: data.pageCount,
      });
    } catch (err: any) {
      console.error('Process error:', err);
      setError(err.message || 'An error occurred while processing the PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Upload State */}
      {!file && (
        <div className="max-w-2xl mx-auto">
          <UploadZone
            accept="application/pdf"
            maxFiles={1}
            maxSizeMb={50}
            title="Upload PDF to View & Organize Pages"
            subtitle="View real-time visual page previews, reorder, delete, rotate, or extract specific pages."
            onFilesSelected={(files) => handleFileSelected(files[0])}
          />
        </div>
      )}

      {/* Loading Thumbnails Progress Bar */}
      {loadingThumbnails && (
        <div className="max-w-xl mx-auto p-8 rounded-3xl bg-base-100 border border-base-300 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-base-content">Generating Visual Page Previews...</h3>
            <p className="text-xs text-base-content/60">
              Rendering page {thumbnailProgress.loaded} of {thumbnailProgress.total}
            </p>
          </div>
          <progress
            className="progress progress-primary w-full"
            value={thumbnailProgress.loaded}
            max={thumbnailProgress.total || 100}
          ></progress>
        </div>
      )}

      {/* Interactive Visual Page Workspace (Matching Screenshot) */}
      {file && !loadingThumbnails && !resultData && (
        <div className="space-y-4">
          {/* Top Control Action Bar */}
          <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-sm flex flex-wrap items-center justify-between gap-4">
            {/* Left: Back / Reset & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="btn btn-ghost btn-sm btn-circle text-base-content/70 hover:text-base-content"
                title="Upload different file"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-cyan-500 flex items-center justify-center text-white shadow-sm">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-base-content leading-none">
                    {initialMode === 'delete'
                      ? 'Delete PDF Pages'
                      : initialMode === 'rotate'
                      ? 'Rotate PDF Pages'
                      : 'Extract & Organize Pages'}
                  </h2>
                  <span className="text-[11px] text-base-content/50 font-medium">
                    {pages.length} total pages in document
                  </span>
                </div>
              </div>
            </div>

            {/* Mode / Bulk Action Tools */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => rotateSelected(-90)}
                disabled={selectedCount === 0}
                className="btn btn-ghost btn-xs sm:btn-sm gap-1 text-xs"
                title="Rotate selected left"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rotate Left</span>
              </button>

              <button
                onClick={() => rotateSelected(90)}
                disabled={selectedCount === 0}
                className="btn btn-ghost btn-xs sm:btn-sm gap-1 text-xs"
                title="Rotate selected right"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rotate Right</span>
              </button>

              <button
                onClick={deleteSelected}
                disabled={selectedCount === 0}
                className="btn btn-ghost btn-xs sm:btn-sm text-error gap-1 text-xs"
                title="Delete selected pages"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete ({selectedCount})</span>
              </button>

              {/* Separate PDFs Toggle */}
              <label className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded-xl bg-base-200 text-xs text-base-content/70">
                <input
                  type="checkbox"
                  checked={separatePdfs}
                  onChange={(e) => setSeparatePdfs(e.target.checked)}
                  className="toggle toggle-xs toggle-primary"
                />
                <span className="hidden md:inline">Separate PDFs (ZIP)</span>
              </label>

              {/* Finish / Primary CTA Button */}
              <button
                onClick={handleProcess}
                disabled={processing || (initialMode !== 'delete' && selectedCount === 0)}
                className="btn btn-primary btn-sm gap-2 shadow-md shadow-primary/20"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Finish</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Selection Ribbon */}
          <div className="px-4 py-2 rounded-xl bg-base-200/60 border border-base-300 flex flex-wrap items-center justify-between text-xs text-base-content/70 gap-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => selectAll(!allSelected)}
                className="flex items-center gap-1.5 font-medium text-base-content hover:text-primary transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>Select All</span>
              </button>

              <button
                onClick={selectOdd}
                className="hover:text-primary font-medium transition-colors"
              >
                Select Odd
              </button>

              <button
                onClick={selectEven}
                className="hover:text-primary font-medium transition-colors"
              >
                Select Even
              </button>
            </div>

            <div className="font-semibold text-primary">
              {selectedCount} of {pages.length} pages selected
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error text-xs rounded-2xl shadow-sm">
              <span>{error}</span>
            </div>
          )}

          {/* Rendered Thumbnail Grid (Visual Cards) */}
          <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`group relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-200 ${
                    page.selected
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/20'
                      : 'border-base-300 bg-base-100 hover:border-base-content/30 shadow-sm'
                  }`}
                >
                  {/* Card Selection Checkbox */}
                  <div
                    onClick={() => toggleSelectPage(page.id)}
                    className="absolute top-2 left-2 z-10 cursor-pointer p-1 rounded-md bg-base-100/90 backdrop-blur-sm border border-base-300 shadow-sm hover:scale-110 transition-transform"
                  >
                    {page.selected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-base-content/40" />
                    )}
                  </div>

                  {/* Hover Action Overlay Bar */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-base-100/90 backdrop-blur-sm p-1 rounded-lg border border-base-300 shadow-sm">
                    <button
                      onClick={() => rotatePage(page.id, -90)}
                      className="p-1 text-base-content/70 hover:text-primary rounded hover:bg-base-200"
                      title="Rotate 90° Left"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => rotatePage(page.id, 90)}
                      className="p-1 text-base-content/70 hover:text-primary rounded hover:bg-base-200"
                      title="Rotate 90° Right"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setZoomPage(page)}
                      className="p-1 text-base-content/70 hover:text-primary rounded hover:bg-base-200"
                      title="Zoom Preview"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deletePage(page.id)}
                      className="p-1 text-error hover:bg-error/10 rounded"
                      title="Delete this page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Thumbnail Image Container */}
                  <div
                    onClick={() => toggleSelectPage(page.id)}
                    className="w-full aspect-[1/1.4] rounded-xl overflow-hidden bg-base-200 flex items-center justify-center cursor-pointer relative shadow-inner"
                  >
                    <img
                      src={page.dataUrl}
                      alt={`Page ${page.pageNumber}`}
                      className="max-w-full max-h-full object-contain transition-transform duration-200"
                      style={{
                        transform: `rotate(${page.rotation}deg)`,
                      }}
                    />
                  </div>

                  {/* Page Badge & Actions Underneath */}
                  <div className="w-full mt-2.5 flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-base-200 text-base-content/70 font-semibold text-[11px]">
                      Page {page.pageNumber}
                    </span>

                    {/* Left/Right Reordering Arrows */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {index > 0 && (
                        <button
                          onClick={() => movePage(index, 'left')}
                          className="px-1 py-0.5 rounded bg-base-200 hover:bg-base-300 text-[10px] font-bold"
                          title="Move Left"
                        >
                          ←
                        </button>
                      )}
                      {index < pages.length - 1 && (
                        <button
                          onClick={() => movePage(index, 'right')}
                          className="px-1 py-0.5 rounded bg-base-200 hover:bg-base-300 text-[10px] font-bold"
                          title="Move Right"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Result View */}
      {resultData && (
        <div className="max-w-xl mx-auto p-8 rounded-3xl bg-base-100 border border-base-300 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-success/10 text-success flex items-center justify-center shadow-lg shadow-success/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-base-content">
              Your PDF is Ready!
            </h3>
            <p className="text-xs text-base-content/60">
              Successfully processed {resultData.pageCount} pages ({formatBytes(resultData.size)}).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={resultData.dataUrl}
              download={resultData.filename}
              className="btn btn-primary w-full sm:w-auto gap-2 px-8 shadow-lg shadow-primary/25"
            >
              <Download className="w-4 h-4" />
              <span>Download {resultData.filename.endsWith('.zip') ? 'ZIP' : 'PDF'}</span>
            </a>

            <button
              onClick={handleReset}
              className="btn btn-ghost w-full sm:w-auto text-xs"
            >
              Organize Another File
            </button>
          </div>
        </div>
      )}

      {/* Zoom Fullscreen Preview Modal */}
      {zoomPage && (
        <div
          onClick={() => setZoomPage(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[90vh] bg-base-100 rounded-3xl p-4 shadow-2xl flex flex-col items-center"
          >
            <button
              onClick={() => setZoomPage(null)}
              className="absolute top-4 right-4 btn btn-circle btn-sm btn-ghost"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="font-bold text-sm mb-3">Page {zoomPage.pageNumber} Preview</h4>

            <div className="overflow-auto max-h-[75vh] rounded-xl flex items-center justify-center bg-base-200 p-2">
              <img
                src={zoomPage.dataUrl}
                alt={`Page ${zoomPage.pageNumber}`}
                className="max-h-full object-contain rounded-lg shadow-md"
                style={{
                  transform: `rotate(${zoomPage.rotation}deg)`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
