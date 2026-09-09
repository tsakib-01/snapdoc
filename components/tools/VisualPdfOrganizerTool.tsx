'use client';

import React, { useState, useRef } from 'react';
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
  ArrowRight,
  RefreshCw,
  X,
  Scissors,
  CheckCircle2,
  ArrowUpDown,
  List,
  LayoutGrid,
  ChevronDown,
  Minus,
  GripVertical,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';

export interface VisualPageItem {
  id: string;
  originalIndex: number; // 0-based index in original file
  pageNumber: number; // 1-based display index
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
  title = 'Organize & Split PDF',
  description = 'Visually reorder by dragging pages, rotate, delete, extract or split PDF pages with live thumbnail previews.',
}: VisualPdfOrganizerToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<VisualPageItem[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState({ loaded: 0, total: 0 });
  const [toolTab, setToolTab] = useState<'split' | 'extract'>(
    initialMode === 'split' ? 'split' : 'extract'
  );
  
  // Split settings
  const [splitEveryN, setSplitEveryN] = useState(1);
  const [splitCustomCuts, setSplitCustomCuts] = useState<Set<number>>(new Set()); // indices after which a cut occurs
  const [splitAfterEveryEnabled, setSplitAfterEveryEnabled] = useState(true);

  // Extract settings
  const [separatePdfs, setSeparatePdfs] = useState(false);

  // View & UI
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Execution & results
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

  // Handle file selection
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
    setSplitCustomCuts(new Set());
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // set small drag preview ghost opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setPages((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedIndex, 1);
      updated.splice(dropIndex, 0, movedItem);
      // Renumber display pageNumbers
      return updated.map((item, idx) => ({
        ...item,
        pageNumber: idx + 1,
      }));
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Toggle page selection
  const toggleSelectPage = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAll = (select: boolean) => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: select })));
  };

  // Rotate single page
  const rotatePage = (id: string, angleDelta: number) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, rotation: (p.rotation + angleDelta + 360) % 360 };
        }
        return p;
      })
    );
  };

  // Rotate selected pages
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

  // Delete single page
  const deletePage = (id: string) => {
    setPages((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      return filtered.map((item, idx) => ({ ...item, pageNumber: idx + 1 }));
    });
  };

  // Delete selected pages
  const deleteSelected = () => {
    setPages((prev) => {
      const filtered = prev.filter((p) => !p.selected);
      return filtered.map((item, idx) => ({ ...item, pageNumber: idx + 1 }));
    });
  };

  // Insert a blank page
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

  // Toggle custom cut point between pages for split mode
  const toggleCutPoint = (index: number) => {
    setSplitCustomCuts((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Sort pages
  const toggleSort = () => {
    const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(nextOrder);
    setPages((prev) => {
      const reversed = [...prev].reverse();
      return reversed.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
  };

  const selectedCount = pages.filter((p) => p.selected).length;
  const allSelected = pages.length > 0 && selectedCount === pages.length;

  // Calculate number of output PDFs for Split mode
  const calculatedSplitCount = toolTab === 'split'
    ? splitAfterEveryEnabled
      ? Math.ceil(pages.length / Math.max(1, splitEveryN))
      : splitCustomCuts.size + 1
    : 1;

  // Execute processing
  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const pagesToInclude = pages
        .filter((p) => (initialMode === 'delete' ? !p.selected : p.selected))
        .map((p) => ({
          pageIndex: p.originalIndex,
          rotation: p.rotation,
        }));

      if (pagesToInclude.length === 0) {
        throw new Error('Please select at least 1 page to include.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('pages', JSON.stringify(pagesToInclude));

      // In split mode or separate PDFs toggle, generate ZIP of separate files
      const isSeparate = toolTab === 'split' || separatePdfs;
      formData.append('separateFiles', isSeparate ? 'true' : 'false');

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

  // Truncate document name for bottom card pill
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

      {/* Simplified Clean Smallpdf-Style Workspace (Matching Screenshot) */}
      {file && !loadingThumbnails && !resultData && (
        <div className="w-full bg-[#f0f4f9] dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[720px]">
          {/* Top Control Bar */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
            {/* Left: Reset & Action Pills */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Upload different file"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white mr-2">
                {toolTab === 'split' ? 'Split' : 'Extract Pages'}
              </h2>

              {/* Mode Pills: Split / Extract / Add / Rotations */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setToolTab('split')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    toolTab === 'split'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Split</span>
                </button>

                <button
                  onClick={() => setToolTab('extract')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    toolTab === 'extract'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Extract</span>
                </button>

                <div className="dropdown dropdown-end">
                  <label
                    tabIndex={0}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
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
            </div>

            {/* Right: Dynamic Split Controls / Separate PDFs & Finish Button */}
            <div className="flex items-center gap-3">
              {toolTab === 'split' ? (
                /* Split Settings Controls (Matching Screenshot) */
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={splitAfterEveryEnabled}
                      onChange={(e) => setSplitAfterEveryEnabled(e.target.checked)}
                      className="checkbox checkbox-xs checkbox-primary rounded"
                    />
                    <span>Split after every</span>
                  </label>

                  <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
                    <button
                      onClick={() => setSplitEveryN((n) => Math.max(1, n - 1))}
                      className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2.5 py-1 font-bold text-xs min-w-[24px] text-center">
                      {splitEveryN}
                    </span>
                    <button
                      onClick={() => setSplitEveryN((n) => Math.min(pages.length, n + 1))}
                      className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span>pages</span>
                </div>
              ) : (
                /* Extract Settings: Separate PDFs Toggle */
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={separatePdfs}
                    onChange={(e) => setSeparatePdfs(e.target.checked)}
                    className="toggle toggle-sm toggle-primary"
                  />
                  <span>Separate PDFs</span>
                </label>
              )}

              {/* Finish CTA Button */}
              <button
                onClick={handleProcess}
                disabled={processing || pages.length === 0}
                className="btn btn-primary btn-sm px-6 font-bold shadow-md shadow-blue-500/20 rounded-xl gap-2 text-white bg-blue-600 hover:bg-blue-700 border-none transition-all hover:scale-[1.02] active:scale-95"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {toolTab === 'split'
                        ? `Split (${calculatedSplitCount} PDF${calculatedSplitCount > 1 ? 's' : ''})`
                        : `Finish (${selectedCount} Page${selectedCount > 1 ? 's' : ''})`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sub-Header: Select All & Sort View Controls */}
          <div className="px-6 py-2 flex items-center justify-between text-xs text-slate-500 border-b border-slate-200/60 dark:border-slate-800">
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
              <span className="text-[11px] text-slate-400">
                💡 Tip: Drag & drop any page to rearrange order
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSort}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/60 text-slate-700 dark:text-slate-300 font-medium"
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

          {/* Error Notice */}
          {error && (
            <div className="m-4 alert alert-error text-xs rounded-xl shadow-sm">
              <span>{error}</span>
            </div>
          )}

          {/* Interactive PDF Page Canvas */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto max-h-[calc(100vh-250px)]">
            {viewMode === 'grid' ? (
              <div className="flex flex-wrap items-center justify-start gap-4 sm:gap-6">
                {pages.map((page, index) => {
                  const isCutPoint =
                    toolTab === 'split' &&
                    (splitAfterEveryEnabled
                      ? (index + 1) % Math.max(1, splitEveryN) === 0 && index < pages.length - 1
                      : splitCustomCuts.has(index));

                  const isDraggingThis = draggedIndex === index;
                  const isDragOverThis = dragOverIndex === index;

                  return (
                    <React.Fragment key={page.id}>
                      {/* Drag & Drop Page Card Container */}
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`group relative flex flex-col items-center cursor-grab active:cursor-grabbing transition-transform duration-150 ${
                          isDraggingThis ? 'opacity-40 scale-95' : ''
                        } ${isDragOverThis ? 'scale-105 ring-2 ring-blue-500 ring-offset-2 rounded-xl' : ''}`}
                      >
                        {/* Soft Blue Card Plate (Matching Screenshot) */}
                        <div
                          className={`relative w-44 sm:w-52 aspect-[1/1.42] bg-[#e9f0fa] dark:bg-slate-800/80 rounded-xl p-3 flex flex-col items-center justify-center transition-all duration-200 border ${
                            page.selected
                              ? 'border-blue-400 dark:border-blue-600 shadow-md'
                              : 'border-slate-200/80 dark:border-slate-700 shadow-sm'
                          }`}
                        >
                          {/* Top-left Drag Handle / Checkbox */}
                          <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
                            <div
                              onClick={() => toggleSelectPage(page.id)}
                              className="cursor-pointer p-0.5 rounded transition-transform hover:scale-110"
                            >
                              {page.selected ? (
                                <CheckSquare className="w-5 h-5 text-blue-600 fill-white" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-400 fill-white/80" />
                              )}
                            </div>
                            <GripVertical className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>

                          {/* Hover action overlay pills */}
                          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-md">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomPage(page);
                              }}
                              className="p-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded hover:bg-slate-100"
                              title="Zoom page"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rotatePage(page.id, -90);
                              }}
                              className="p-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded hover:bg-slate-100"
                              title="Rotate Left"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rotatePage(page.id, 90);
                              }}
                              className="p-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded hover:bg-slate-100"
                              title="Rotate Right"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePage(page.id);
                              }}
                              className="p-1 text-slate-600 dark:text-slate-300 hover:text-red-500 rounded hover:bg-red-50"
                              title="Delete Page"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* White Inner Paper Sheet */}
                          <div
                            onClick={() => toggleSelectPage(page.id)}
                            className="w-full h-full bg-white dark:bg-slate-900 rounded shadow-sm overflow-hidden flex items-center justify-center p-1.5"
                          >
                            <img
                              src={page.dataUrl}
                              alt={`Page ${page.pageNumber}`}
                              className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-150"
                              style={{
                                transform: `rotate(${page.rotation}deg)`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Pink / Rose Pill Badge with Document Name (Matching Screenshot) */}
                        <div className="mt-2.5 flex flex-col items-center">
                          <span className="px-3 py-0.5 rounded-md bg-[#fed7d7] text-[#9b2c2c] dark:bg-pink-950/60 dark:text-pink-300 font-medium text-[11px] truncate max-w-[180px] shadow-xs">
                            {shortDocName}
                          </span>
                          <span className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {page.pageNumber}
                          </span>
                        </div>
                      </div>

                      {/* Divider between cards: Split Cut Line (✂) or Insert Button (+) */}
                      {index < pages.length - 1 && (
                        <div className="flex flex-col items-center justify-center self-stretch px-1">
                          {toolTab === 'split' ? (
                            /* Split Line with Scissor Icon (Matching Screenshot) */
                            <div className="relative flex flex-col items-center justify-center h-full group">
                              <div
                                className={`w-0.5 h-48 transition-colors ${
                                  isCutPoint
                                    ? 'bg-blue-600 dark:bg-blue-500'
                                    : 'bg-transparent group-hover:bg-blue-300'
                                }`}
                              ></div>
                              <button
                                onClick={() => toggleCutPoint(index)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm ${
                                  isCutPoint
                                    ? 'bg-blue-600 text-white scale-110 shadow-blue-500/40'
                                    : 'bg-blue-100 text-blue-600 opacity-60 hover:opacity-100 hover:scale-110'
                                }`}
                                title="Click to toggle split cut point"
                              >
                                <Scissors className="w-3.5 h-3.5" />
                              </button>
                              <div
                                className={`w-0.5 h-48 transition-colors ${
                                  isCutPoint
                                    ? 'bg-blue-600 dark:bg-blue-500'
                                    : 'bg-transparent group-hover:bg-blue-300'
                                }`}
                              ></div>
                            </div>
                          ) : (
                            /* Organize / Extract Mode Insert (+) Button */
                            <button
                              onClick={() => insertBlankPage(index + 1)}
                              className="w-7 h-7 rounded-full bg-blue-500/20 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all hover:scale-125 shadow-xs"
                              title="Insert blank page here"
                            >
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              /* List View with Drag Handles */
              <div className="space-y-3 max-w-2xl mx-auto">
                {pages.map((page, index) => (
                  <div
                    key={page.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => toggleSelectPage(page.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${
                      page.selected
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical className="w-4 h-4 text-slate-400" />
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
