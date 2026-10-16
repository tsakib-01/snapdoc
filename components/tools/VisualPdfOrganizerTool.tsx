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
  Check,
  Eye,
  HardDrive,
  Calendar,
  Layers,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { extractPdfThumbnails } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';

export interface VisualPageItem {
  id: string;
  fileIndex: number; // 0-based index of source file
  originalIndex: number; // 0-based index in original file (-1 for blank)
  pageNumber: number; // 1-based display index
  dataUrl: string;
  rotation: number; // 0, 90, 180, 270
  selected: boolean;
  aspectRatio: number;
  isBlank?: boolean;
  docName?: string;
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
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] || null;
  const [pages, setPages] = useState<VisualPageItem[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState({ loaded: 0, total: 0 });
  const [toolTab, setToolTab] = useState<'split' | 'extract'>(
    initialMode === 'split' ? 'split' : 'extract'
  );
  
  // Split settings
  const [splitEveryN, setSplitEveryN] = useState(1);
  const [splitCustomCuts, setSplitCustomCuts] = useState<Set<number>>(new Set());
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
  const [showResultPreviewModal, setShowResultPreviewModal] = useState<boolean>(false);
  const [createdTimestamp, setCreatedTimestamp] = useState<string>('');
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Handle initial file selection
  const handleFileSelected = async (selectedFile: File) => {
    setFiles([selectedFile]);
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
        id: `page-0-${idx}-${Date.now()}`,
        fileIndex: 0,
        originalIndex: idx,
        pageNumber: idx + 1,
        dataUrl: thumb.dataUrl,
        rotation: 0,
        selected: initialMode === 'delete' ? false : true,
        aspectRatio: thumb.aspectRatio,
        docName: selectedFile.name,
      }));

      setPages(initialPages);
    } catch (err: any) {
      console.error('Thumbnail error:', err);
      setError('Could not render PDF pages. Please ensure the file is a valid, unencrypted PDF.');
    } finally {
      setLoadingThumbnails(false);
    }
  };

  // Handle adding new document pages without deleting existing ones
  const handleAddDocumentPages = async (newFile: File) => {
    setError(null);
    setLoadingThumbnails(true);
    setThumbnailProgress({ loaded: 0, total: 0 });

    try {
      const { thumbnails } = await extractPdfThumbnails(newFile, {
        onProgress: (loaded, total) => {
          setThumbnailProgress({ loaded, total });
        },
      });

      const nextFileIndex = files.length;
      setFiles((prev) => [...prev, newFile]);

      const additionalPages: VisualPageItem[] = thumbnails.map((thumb, idx) => ({
        id: `page-${nextFileIndex}-${idx}-${Date.now()}`,
        fileIndex: nextFileIndex,
        originalIndex: idx,
        pageNumber: pages.length + idx + 1,
        dataUrl: thumb.dataUrl,
        rotation: 0,
        selected: initialMode === 'delete' ? false : true,
        aspectRatio: thumb.aspectRatio,
        docName: newFile.name,
      }));

      setPages((prev) => {
        const combined = [...prev, ...additionalPages];
        return combined.map((item, idx) => ({
          ...item,
          pageNumber: idx + 1,
        }));
      });
    } catch (err: any) {
      console.error('Thumbnail error adding document:', err);
      setError('Could not render pages from the added PDF. Please ensure the file is a valid, unencrypted PDF.');
    } finally {
      setLoadingThumbnails(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setPages([]);
    setResultData(null);
    setError(null);
    setSplitCustomCuts(new Set());
    setShowResultPreviewModal(false);
    setCreatedTimestamp('');
    if (addFileInputRef.current) {
      addFileInputRef.current.value = '';
    }
  };

  const handleDownloadResult = () => {
    if (!resultData?.dataUrl) return;
    const link = document.createElement('a');
    link.href = resultData.dataUrl;
    link.download = resultData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4';
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
          const nextRot = (p.rotation + angleDelta + 360) % 360;
          return { ...p, rotation: nextRot };
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
      fileIndex: -1,
      originalIndex: -1,
      isBlank: true,
      pageNumber: insertIndex + 1,
      dataUrl: blankDataUrl,
      rotation: 0,
      selected: true,
      aspectRatio: 842 / 595,
      docName: 'Blank Page',
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
    if (files.length === 0) return;

    setProcessing(true);
    setError(null);

    try {
      const pagesToInclude = pages
        .filter((p) => (initialMode === 'delete' ? !p.selected : p.selected))
        .map((p) => ({
          fileIndex: p.fileIndex ?? 0,
          pageIndex: p.originalIndex,
          rotation: p.rotation,
          isBlank: p.isBlank ?? false,
        }));

      if (pagesToInclude.length === 0) {
        throw new Error('Please select at least 1 page to include.');
      }

      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      if (files[0]) {
        formData.append('file', files[0]);
      }
      formData.append('pages', JSON.stringify(pagesToInclude));

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

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setCreatedTimestamp(`${dateStr} • ${timeStr}`);

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

  const shortDocName = file
    ? file.name.length > 18
      ? `${file.name.slice(0, 15)}...`
      : file.name
    : 'Document.pdf';

  return (
    <div className="w-full space-y-6">
      {/* Upload State */}
      {!file && (
        <div className="max-w-2xl mx-auto">
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

      {/* Loading Thumbnails Progress */}
      {loadingThumbnails && (
        <div className="max-w-xl mx-auto p-8 rounded-3xl bg-base-200/50 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-base-content">Generating Page Previews...</h3>
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

      {/* Seamless, Natural Workspace - No Hardcoded Outer Boxes */}
      {file && !loadingThumbnails && !resultData && (
        <div className="w-full space-y-5">
          {/* Top Integrated Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-base-200/60 backdrop-blur-md border border-base-300/80 shadow-xs">
            {/* Left: Reset & Tools */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={handleReset}
                className="btn btn-ghost btn-xs sm:btn-sm btn-circle text-base-content/70 hover:text-base-content"
                title="Upload different file"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <span className="font-extrabold text-sm sm:text-lg text-base-content mr-1">
                {toolTab === 'split' ? 'Split' : 'Extract Pages'}
              </span>

              {/* Action Pills */}
              <div className="flex items-center gap-1 bg-base-100 p-0.5 sm:p-1 rounded-xl border border-base-300">
                <button
                  onClick={() => setToolTab('split')}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    toolTab === 'split'
                      ? 'bg-primary text-primary-content shadow-xs'
                      : 'text-base-content/70 hover:text-base-content'
                  }`}
                >
                  <Scissors className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Split</span>
                </button>

                <button
                  onClick={() => setToolTab('extract')}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    toolTab === 'extract'
                      ? 'bg-primary text-primary-content shadow-xs'
                      : 'text-base-content/70 hover:text-base-content'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Extract</span>
                </button>

                <div className="dropdown dropdown-end">
                  <label
                    tabIndex={0}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-base-content/70 hover:bg-base-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    <span>Add</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </label>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-30 menu p-2 shadow-xl bg-base-100 rounded-2xl border border-base-300 w-48 text-xs space-y-1 mt-1"
                  >
                    <li>
                      <button onClick={() => insertBlankPage(pages.length)}>
                        <Plus className="w-4 h-4 text-primary" />
                        <span>Insert Blank Page</span>
                      </button>
                    </li>
                    <li>
                      <button onClick={() => addFileInputRef.current?.click()}>
                        <FileText className="w-4 h-4 text-success" />
                        <span>Add Document Pages</span>
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="w-px h-4 bg-base-300 mx-1"></div>

                <button
                  onClick={() => rotateSelected(-90)}
                  disabled={selectedCount === 0}
                  className="p-1.5 rounded-lg text-base-content/70 hover:bg-base-200 disabled:opacity-40"
                  title="Rotate Left"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => rotateSelected(90)}
                  disabled={selectedCount === 0}
                  className="p-1.5 rounded-lg text-base-content/70 hover:bg-base-200 disabled:opacity-40"
                  title="Rotate Right"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={deleteSelected}
                  disabled={selectedCount === 0}
                  className="p-1.5 rounded-lg text-error hover:bg-error/10 disabled:opacity-40"
                  title="Delete Selected"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right: Dynamic Split Controls / Separate PDFs & Finish Button */}
            <div className="flex items-center gap-3">
              {toolTab === 'split' ? (
                <div className="flex items-center gap-2 text-xs font-medium text-base-content/80">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={splitAfterEveryEnabled}
                      onChange={(e) => setSplitAfterEveryEnabled(e.target.checked)}
                      className="checkbox checkbox-xs checkbox-primary rounded"
                    />
                    <span>Split after every</span>
                  </label>

                  <div className="flex items-center border border-base-300 rounded-lg bg-base-100 overflow-hidden">
                    <button
                      onClick={() => setSplitEveryN((n) => Math.max(1, n - 1))}
                      className="px-2 py-1 hover:bg-base-200 text-base-content/70"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2.5 py-1 font-bold text-xs min-w-[24px] text-center">
                      {splitEveryN}
                    </span>
                    <button
                      onClick={() => setSplitEveryN((n) => Math.min(pages.length, n + 1))}
                      className="px-2 py-1 hover:bg-base-200 text-base-content/70"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span>pages</span>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-base-content/80">
                  <input
                    type="checkbox"
                    checked={separatePdfs}
                    onChange={(e) => setSeparatePdfs(e.target.checked)}
                    className="toggle toggle-xs toggle-primary"
                  />
                  <span>Separate PDFs</span>
                </label>
              )}

              {/* Finish CTA Button */}
              <button
                onClick={handleProcess}
                disabled={processing || pages.length === 0}
                className="btn btn-primary btn-sm px-6 font-bold shadow-md shadow-primary/20 rounded-xl gap-2 hover:scale-[1.02] active:scale-95 transition-all"
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
          <div className="px-2 flex items-center justify-between text-xs text-base-content/60">
            <div className="flex items-center gap-3">
              <label
                onClick={() => selectAll(!allSelected)}
                className="flex items-center gap-2 cursor-pointer font-semibold text-base-content select-none hover:text-primary transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-base-content/40" />
                )}
                <span>Select all</span>
              </label>
              <span className="text-[11px] text-base-content/40 hidden sm:inline">
                • Drag & drop any page to rearrange order
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSort}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-base-200 text-base-content/70 font-medium"
                title="Reverse Order"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="text-[11px]">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              <div className="flex items-center bg-base-200 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded ${
                    viewMode === 'list'
                      ? 'bg-base-100 text-primary shadow-xs'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded ${
                    viewMode === 'grid'
                      ? 'bg-base-100 text-primary shadow-xs'
                      : 'text-base-content/60 hover:text-base-content'
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
            <div className="alert alert-error text-xs rounded-2xl shadow-sm">
              <span>{error}</span>
            </div>
          )}

          {/* Interactive PDF Page Canvas - Fully Natural Flow */}
          <div className="py-2">
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
                      {/* Drag & Drop Page Card */}
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`group relative flex flex-col items-center cursor-grab active:cursor-grabbing transition-transform duration-150 ${
                          isDraggingThis ? 'opacity-30 scale-95' : ''
                        } ${isDragOverThis ? 'scale-105 ring-2 ring-primary ring-offset-2 rounded-2xl' : ''}`}
                      >
                        {/* Checkbox Floating top-left */}
                        <div
                          onClick={() => toggleSelectPage(page.id)}
                          className="absolute -top-3 left-0 z-20 cursor-pointer p-0.5 rounded transition-transform hover:scale-110"
                        >
                          {page.selected ? (
                            <CheckSquare className="w-5 h-5 text-primary fill-base-100" />
                          ) : (
                            <Square className="w-5 h-5 text-base-content/40 fill-base-100" />
                          )}
                        </div>

                        {/* Page Preview Thumbnail Container */}
                        <div
                          onClick={() => toggleSelectPage(page.id)}
                          className={`relative w-40 sm:w-48 aspect-[1/1.414] bg-white rounded-xl p-2 transition-all duration-200 cursor-pointer select-none flex items-center justify-center ${
                            page.selected
                              ? 'ring-2 ring-primary shadow-lg shadow-primary/10'
                              : 'border border-base-300 shadow-md hover:shadow-xl hover:border-primary/50'
                          }`}
                        >
                          {/* Hover action pill overlay */}
                          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-base-100/95 backdrop-blur-sm p-1 rounded-lg border border-base-300 shadow-md">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomPage(page);
                              }}
                              className="p-1 text-base-content/70 hover:text-primary rounded hover:bg-base-200"
                              title="Zoom page"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rotatePage(page.id, -90);
                              }}
                              className="p-1 text-base-content/70 hover:text-primary rounded hover:bg-base-200"
                              title="Rotate Left"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rotatePage(page.id, 90);
                              }}
                              className="p-1 text-base-content/70 hover:text-primary rounded hover:bg-base-200"
                              title="Rotate Right"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePage(page.id);
                              }}
                              className="p-1 text-error hover:bg-error/10 rounded"
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
                              className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-150"
                              style={{
                                transform: `rotate(${page.rotation}deg)`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Pink / Rose Pill Badge with Document Name */}
                        <div className="mt-2.5 flex flex-col items-center">
                          <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-medium text-[11px] truncate max-w-[170px] shadow-xs">
                            {shortDocName}
                          </span>
                          <span className="mt-1 text-xs font-semibold text-base-content/80">
                            {page.pageNumber}
                          </span>
                        </div>
                      </div>

                      {/* Divider between cards: Split Cut Line (✂) or Insert Button (+) */}
                      {index < pages.length - 1 && (
                        <div className="flex flex-col items-center justify-center self-stretch px-1">
                          {toolTab === 'split' ? (
                            <div className="relative flex flex-col items-center justify-center h-full group">
                              <div
                                className={`w-0.5 h-36 transition-colors ${
                                  isCutPoint ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/40'
                                }`}
                              ></div>
                              <button
                                onClick={() => toggleCutPoint(index)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-xs ${
                                  isCutPoint
                                    ? 'bg-primary text-primary-content scale-110 shadow-primary/30'
                                    : 'bg-base-200 text-primary opacity-60 hover:opacity-100 hover:scale-110'
                                }`}
                                title="Click to toggle split cut point"
                              >
                                <Scissors className="w-3.5 h-3.5" />
                              </button>
                              <div
                                className={`w-0.5 h-36 transition-colors ${
                                  isCutPoint ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/40'
                                }`}
                              ></div>
                            </div>
                          ) : (
                            <button
                              onClick={() => insertBlankPage(index + 1)}
                              className="w-7 h-7 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-content flex items-center justify-center transition-all hover:scale-125 shadow-xs"
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
              /* List View */
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
                        ? 'border-primary bg-primary/5'
                        : 'border-base-300 bg-base-100'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical className="w-4 h-4 text-base-content/40" />
                      {page.selected ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-base-content/40" />
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
                        <p className="font-bold text-sm text-base-content">
                          Page {page.pageNumber}
                        </p>
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-medium truncate max-w-[150px]">
                          {page.docName ? (page.docName.length > 18 ? page.docName.slice(0, 15) + '...' : page.docName) : shortDocName}
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
                        className="btn btn-ghost btn-xs btn-circle text-error"
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
            handleAddDocumentPages(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Success Result View matching reference design */}
      {resultData && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Area */}
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl sm:text-2xl text-base-content leading-tight">
                {initialMode === 'delete'
                  ? 'Your PDF pages have been deleted successfully!'
                  : initialMode === 'extract'
                  ? 'Your PDF pages have been extracted successfully!'
                  : initialMode === 'rotate'
                  ? 'Your PDF pages have been rotated successfully!'
                  : initialMode === 'split'
                  ? 'Your PDF has been split successfully!'
                  : 'Your PDF has been organized successfully!'}
              </h3>
              <p className="text-xs sm:text-sm text-base-content/60 mt-1">
                Your files have been processed into a clean document. You can now download it or perform other actions below.
              </p>
            </div>
          </div>

          {/* White Card Container */}
          <div className="w-full rounded-3xl bg-base-100 border border-base-300 p-5 sm:p-7 space-y-6 shadow-sm">
            {/* Top file summary card */}
            <div className="rounded-2xl bg-blue-50/60 dark:bg-base-200/50 border border-blue-100/80 dark:border-base-300 p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                {/* Red PDF Document Icon */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                {/* File Meta */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base sm:text-lg text-base-content truncate">
                      {resultData.filename}
                    </h4>
                    <span className="badge badge-sm bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-none font-bold">
                      Ready
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-base-content/60 mt-0.5">
                    {resultData.pageCount} {resultData.pageCount === 1 ? 'page' : 'pages'}  •  {formatBytes(resultData.size)}  •  {resultData.filename.endsWith('.zip') ? 'ZIP' : 'PDF'}
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-base-100 border border-base-200 shadow-xs shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <div className="text-left">
                  <div className="text-[10px] text-base-content/50 uppercase font-bold tracking-wider leading-none">Status</div>
                  <div className="font-extrabold text-xs sm:text-sm text-base-content mt-0.5 leading-none">Completed</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadResult}
                className="btn btn-primary btn-md rounded-xl font-bold text-white shadow-md shadow-primary/20 gap-2 px-6"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </button>

              {!resultData.filename.endsWith('.zip') && (
                <button
                  type="button"
                  onClick={() => setShowResultPreviewModal(true)}
                  className="btn btn-outline border-base-300 hover:bg-base-200 btn-md rounded-xl font-semibold gap-2 px-5 text-base-content"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="btn btn-ghost border border-base-300 btn-md rounded-xl font-semibold gap-1.5 px-4 text-base-content/70 hover:text-base-content"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Process Another</span>
              </button>
            </div>

            {/* File Details */}
            <div className="pt-4 border-t border-base-200 space-y-3.5">
              <h5 className="font-bold text-sm sm:text-base text-base-content">File Details</h5>
              <div className="space-y-2.5 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                    <FileText className="w-4 h-4 text-base-content/40" />
                    <span>File name</span>
                  </span>
                  <span className="text-base-content/40">:</span>
                  <span className="font-semibold text-base-content truncate">{resultData.filename}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                    <HardDrive className="w-4 h-4 text-base-content/40" />
                    <span>File size</span>
                  </span>
                  <span className="text-base-content/40">:</span>
                  <span className="font-semibold text-base-content">{formatBytes(resultData.size)}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                    <Layers className="w-4 h-4 text-base-content/40" />
                    <span>Pages</span>
                  </span>
                  <span className="text-base-content/40">:</span>
                  <span className="font-semibold text-base-content">{resultData.pageCount} pages</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                    <Calendar className="w-4 h-4 text-base-content/40" />
                    <span>Created</span>
                  </span>
                  <span className="text-base-content/40">:</span>
                  <span className="font-semibold text-base-content">{createdTimestamp}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Fullscreen PDF Preview Modal */}
      {showResultPreviewModal && resultData?.dataUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowResultPreviewModal(false)}
        >
          <div
            className="relative bg-base-100 rounded-3xl p-4 sm:p-5 max-w-4xl w-full h-[85vh] flex flex-col gap-3 shadow-2xl border border-base-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-base-200">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-red-500 shrink-0" />
                <h5 className="font-bold text-sm sm:text-base text-base-content truncate">
                  {resultData.filename}
                </h5>
                <span className="badge badge-sm font-semibold">{resultData.pageCount} Pages</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadResult}
                  className="btn btn-xs btn-primary font-bold gap-1 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowResultPreviewModal(false)}
                  className="btn btn-ghost btn-xs btn-circle"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-base-200/50 rounded-2xl overflow-hidden">
              <iframe
                src={resultData.dataUrl}
                className="w-full h-full border-none rounded-2xl"
                title="PDF Preview"
              />
            </div>
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
            className="relative max-w-2xl max-h-[90vh] bg-base-100 rounded-3xl p-5 shadow-2xl flex flex-col items-center border border-base-300"
          >
            <button
              onClick={() => setZoomPage(null)}
              className="absolute top-4 right-4 btn btn-circle btn-sm btn-ghost"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="font-bold text-sm mb-3 text-base-content">
              Page {zoomPage.pageNumber} Preview
            </h4>

            <div className="overflow-auto max-h-[75vh] rounded-xl flex items-center justify-center bg-base-200 p-3">
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
