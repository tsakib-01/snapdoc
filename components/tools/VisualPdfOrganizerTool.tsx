'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
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
  X,
  Layers,
  Scissors,
  CheckCircle2,
  Minimize2,
  PenTool,
  Grid,
  ArrowUpDown,
  List,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails } from '@/lib/pdf/pdfThumbnailHelper';
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
  initialMode = 'extract',
  title = 'Extract Pages',
  description = 'Organize, reorder, rotate, delete, and extract PDF pages visually with live thumbnail previews.',
}: VisualPdfOrganizerToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<VisualPageItem[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState({ loaded: 0, total: 0 });
  const [currentAction, setCurrentAction] = useState<'extract' | 'split'>(
    initialMode === 'split' ? 'split' : 'extract'
  );
  const [separatePdfs, setSeparatePdfs] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
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
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // When a file is uploaded, extract thumbnails
  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResultData(null);
    setLoadingThumbnails(true);
    setThumbnailProgress({ loaded: 0, total: 0 });

    try {
      const { thumbnails } = await extractPdfThumbnails(selectedFile, {
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
        selected: initialMode === 'delete' ? false : true,
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

  // Insert a blank page at a specific index
  const insertBlankPage = (insertIndex: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 595;
    canvas.height = 842;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Blank Page', canvas.width / 2, canvas.height / 2);
    }
    const blankDataUrl = canvas.toDataURL('image/png');

    const newPage: VisualPageItem = {
      id: `blank-${Date.now()}-${Math.random()}`,
      originalIndex: insertIndex,
      pageNumber: insertIndex + 1,
      dataUrl: blankDataUrl,
      rotation: 0,
      selected: true,
      aspectRatio: 842 / 595,
    };

    setPages((prev) => {
      const updated = [...prev];
      updated.splice(insertIndex, 0, newPage);
      return updated.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
  };

  // Sort pages
  const toggleSort = () => {
    const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(nextOrder);
    setPages((prev) => [...prev].reverse());
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

  // Truncate file name for the card pill badge
  const shortDocName = file
    ? file.name.length > 18
      ? `${file.name.slice(0, 15)}...`
      : file.name
    : 'Document.pdf';

  return (
    <div className="w-full">
      {/* Upload State */}
      {!file && (
        <div className="max-w-2xl mx-auto space-y-4">
          <UploadZone
            accept="application/pdf"
            maxFiles={1}
            maxSizeMb={50}
            title={title}
            subtitle={description}
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

      {/* Interactive Visual Page Workspace (Smallpdf-Inspired Layout) */}
      {file && !loadingThumbnails && !resultData && (
        <div className="flex flex-col lg:flex-row min-h-[750px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-[#f4f7fb] dark:bg-slate-950">
          {/* Left Navigation Sidebar */}
          <aside className="w-full lg:w-20 bg-[#0d1629] text-slate-400 flex lg:flex-col items-center justify-between lg:justify-start py-3 lg:py-5 px-3 lg:px-0 shrink-0 border-r border-slate-800 select-none">
            {/* Top Logo Quadrant Icon */}
            <div className="mb-0 lg:mb-6 flex items-center justify-center">
              <div className="w-8 h-8 rounded-xl bg-slate-800 p-1.5 grid grid-cols-2 gap-1 shadow-inner">
                <div className="bg-red-500 rounded-sm"></div>
                <div className="bg-amber-400 rounded-sm"></div>
                <div className="bg-blue-500 rounded-sm"></div>
                <div className="bg-emerald-500 rounded-sm"></div>
              </div>
            </div>

            {/* Navigation Tool Items */}
            <nav className="flex lg:flex-col items-center gap-1 sm:gap-2 overflow-x-auto lg:overflow-visible w-full px-1">
              <Link
                href="/compress-pdf"
                className="flex flex-col items-center justify-center py-2 px-2.5 rounded-xl hover:text-white hover:bg-slate-800/80 transition-all text-[11px] font-medium group w-full"
                title="Compress PDF"
              >
                <Minimize2 className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                <span>Compress</span>
              </Link>

              <Link
                href="/pdf-to-word"
                className="flex flex-col items-center justify-center py-2 px-2.5 rounded-xl hover:text-white hover:bg-slate-800/80 transition-all text-[11px] font-medium group w-full"
                title="Convert PDF"
              >
                <RefreshCw className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                <span>Convert</span>
              </Link>

              {/* Active Tab: Organize */}
              <div className="flex flex-col items-center justify-center py-2 px-2.5 rounded-xl text-white bg-blue-600/90 shadow-md shadow-blue-600/30 text-[11px] font-bold w-full">
                <LayoutGrid className="w-5 h-5 mb-1" />
                <span>Organize</span>
              </div>

              <Link
                href="/watermark-pdf"
                className="flex flex-col items-center justify-center py-2 px-2.5 rounded-xl hover:text-white hover:bg-slate-800/80 transition-all text-[11px] font-medium group w-full"
                title="Edit PDF"
              >
                <PenTool className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                <span>Edit</span>
              </Link>

              <Link
                href="/sign-pdf"
                className="flex flex-col items-center justify-center py-2 px-2.5 rounded-xl hover:text-white hover:bg-slate-800/80 transition-all text-[11px] font-medium group w-full"
                title="Sign PDF"
              >
                <PenTool className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                <span>Sign</span>
              </Link>

              <Link
                href="/ai-pdf"
                className="flex flex-col items-center justify-center py-2 px-2.5 rounded-xl hover:text-white hover:bg-slate-800/80 transition-all text-[11px] font-medium group w-full"
                title="AI PDF Assistant"
              >
                <Sparkles className="w-5 h-5 mb-1 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>AI PDF</span>
              </Link>

              <Link
                href="/tools"
                className="flex flex-col items-center justify-center py-2 px-2.5 rounded-xl hover:text-white hover:bg-slate-800/80 transition-all text-[11px] font-medium group w-full"
                title="More Tools"
              >
                <Grid className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                <span>More</span>
              </Link>
            </nav>
          </aside>

          {/* Main Interactive Canvas Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] dark:bg-slate-900">
            {/* Top Workspace Header Bar */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              {/* Left Title & Undo */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  title="Upload another file"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h1>
              </div>

              {/* Center Tool Action Pills */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setCurrentAction('split')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    currentAction === 'split'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Split</span>
                </button>

                <button
                  onClick={() => setCurrentAction('extract')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    currentAction === 'extract'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Extract</span>
                </button>

                <div className="dropdown dropdown-end">
                  <label
                    tabIndex={0}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </label>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-30 menu p-2 shadow-xl bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-48 text-xs space-y-1 mt-1"
                  >
                    <li>
                      <button onClick={() => insertBlankPage(pages.length)}>
                        <Plus className="w-4 h-4 text-blue-500" />
                        <span>Insert Blank Page</span>
                      </button>
                    </li>
                    <li>
                      <button onClick={() => addFileInputRef.current?.click()}>
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <span>Add Document Pages</span>
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                <button
                  onClick={() => rotateSelected(-90)}
                  disabled={selectedCount === 0}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                  title="Rotate Left"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => rotateSelected(90)}
                  disabled={selectedCount === 0}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                  title="Rotate Right"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <button
                  onClick={deleteSelected}
                  disabled={selectedCount === 0}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 transition-colors"
                  title="Delete Selected"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Right Action: Separate PDFs & Finish CTA */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={separatePdfs}
                    onChange={(e) => setSeparatePdfs(e.target.checked)}
                    className="toggle toggle-sm toggle-primary"
                  />
                  <span>Separate PDFs</span>
                </label>

                <button
                  onClick={handleProcess}
                  disabled={processing || (initialMode !== 'delete' && selectedCount === 0)}
                  className="btn btn-primary btn-sm px-6 font-bold shadow-lg shadow-blue-500/25 rounded-xl gap-2 hover:scale-[1.02] active:scale-95 transition-all text-white bg-blue-600 hover:bg-blue-700 border-none"
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
            </header>

            {/* Sub-Header Toolbar (Select All & View Toggles) */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              {/* Select All Checkbox */}
              <div className="flex items-center gap-4">
                <label
                  onClick={() => selectAll(!allSelected)}
                  className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200 select-none hover:text-blue-600 transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Select all</span>
                </label>

                <div className="hidden sm:flex items-center gap-2 text-slate-400">
                  <span>•</span>
                  <button onClick={selectOdd} className="hover:text-blue-600">Select Odd</button>
                  <span>•</span>
                  <button onClick={selectEven} className="hover:text-blue-600">Select Even</button>
                </div>
              </div>

              {/* Sort & Layout Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSort}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  title="Reverse Order"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                <div className="flex items-center bg-slate-200/60 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="m-4 alert alert-error text-xs rounded-xl shadow-sm">
                <span>{error}</span>
              </div>
            )}

            {/* PDF Pages Canvas */}
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto max-h-[calc(100vh-280px)]">
              {viewMode === 'grid' ? (
                <div className="flex flex-wrap items-center justify-start gap-4 sm:gap-6">
                  {pages.map((page, index) => (
                    <React.Fragment key={page.id}>
                      {/* Page Card */}
                      <div className="group relative flex flex-col items-center">
                        {/* Checkbox Floating top-left */}
                        <div
                          onClick={() => toggleSelectPage(page.id)}
                          className="absolute -top-3 left-0 z-20 cursor-pointer p-1 rounded-md transition-transform hover:scale-110"
                        >
                          {page.selected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600 fill-white" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 fill-white/80" />
                          )}
                        </div>

                        {/* Page Preview Thumbnail Container */}
                        <div
                          onClick={() => toggleSelectPage(page.id)}
                          className={`relative w-40 sm:w-48 aspect-[1/1.414] bg-white rounded-lg p-2 transition-all duration-150 cursor-pointer select-none flex items-center justify-center ${
                            page.selected
                              ? 'ring-2 ring-blue-600 shadow-lg shadow-blue-500/10'
                              : 'border border-slate-300 dark:border-slate-700 shadow-md hover:shadow-xl hover:border-slate-400'
                          }`}
                        >
                          {/* Hover action pill overlay */}
                          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomPage(page);
                              }}
                              className="p-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Zoom page"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rotatePage(page.id, -90);
                              }}
                              className="p-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Rotate Left"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rotatePage(page.id, 90);
                              }}
                              className="p-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Rotate Right"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePage(page.id);
                              }}
                              className="p-1 text-slate-600 dark:text-slate-300 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Delete Page"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Rendered Canvas Image */}
                          <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white">
                            <img
                              src={page.dataUrl}
                              alt={`Page ${page.pageNumber}`}
                              className="max-w-full max-h-full object-contain transition-transform duration-200"
                              style={{
                                transform: `rotate(${page.rotation}deg)`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Pink / Rose Pill Badge with Document Name (Matching Screenshot) */}
                        <div className="mt-3 flex flex-col items-center">
                          <span className="px-2.5 py-0.5 rounded-md bg-[#fed7d7] text-[#9b2c2c] dark:bg-pink-950/60 dark:text-pink-300 font-medium text-[11px] truncate max-w-[170px] shadow-xs">
                            {shortDocName}
                          </span>
                          <span className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {page.pageNumber}
                          </span>
                        </div>
                      </div>

                      {/* Plus Insert Button Between Pages (Matching Screenshot) */}
                      {index < pages.length - 1 && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => insertBlankPage(index + 1)}
                            className="w-7 h-7 rounded-full bg-blue-500/20 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all hover:scale-125 shadow-xs"
                            title="Insert blank page here"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="space-y-3 max-w-2xl mx-auto">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      onClick={() => toggleSelectPage(page.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                        page.selected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {page.selected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                        <div className="w-12 h-16 bg-white border rounded overflow-hidden flex items-center justify-center p-1">
                          <img
                            src={page.dataUrl}
                            alt={`Page ${page.pageNumber}`}
                            className="max-h-full object-contain"
                            style={{ transform: `rotate(${page.rotation}deg)` }}
                          />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            Page {page.pageNumber}
                          </p>
                          <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 text-[10px] font-medium">
                            {shortDocName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => rotatePage(page.id, 90)}
                          className="btn btn-ghost btn-xs btn-circle"
                          title="Rotate"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePage(page.id)}
                          className="btn btn-ghost btn-xs btn-circle text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Add Document */}
      <input
        ref={addFileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
        }}
      />

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
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl flex flex-col items-center border border-slate-200 dark:border-slate-800"
          >
            <button
              onClick={() => setZoomPage(null)}
              className="absolute top-4 right-4 btn btn-circle btn-sm btn-ghost"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="font-bold text-sm mb-3 text-slate-800 dark:text-slate-200">
              Page {zoomPage.pageNumber} Preview
            </h4>

            <div className="overflow-auto max-h-[75vh] rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 p-3">
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
