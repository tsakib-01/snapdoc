'use client';

import React, { useState, useRef } from 'react';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  MoveUp,
  MoveDown,
  X,
  FileText,
  Plus,
  AlertCircle,
  FilePlus2,
  ZoomIn,
  LayoutGrid,
  List,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Check,
  FileCheck2,
  Eye,
  HardDrive,
  Calendar,
  Layers,
  Download,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import PdfPreviewModalViewer from '@/components/ui/PdfPreviewModalViewer';
import { extractPdfThumbnails } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';
import { scrollToTool } from '@/lib/utils/scrollHelper';
import { PDFDocument } from 'pdf-lib';
import { useProgressAction } from '@/lib/hooks/useProgressAction';
import ProcessingButton from '@/components/ui/ProcessingButton';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface PdfMergeItem {
  id: string;
  file: File;
  thumbnailUrl: string | null;
  pageCount: number | null;
  aspectRatio: number;
  loading: boolean;
  error?: string;
}

export default function MergePdfTool() {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<PdfMergeItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [zoomItem, setZoomItem] = useState<PdfMergeItem | null>(null);
  const [showResultPreviewModal, setShowResultPreviewModal] = useState<boolean>(false);
  const [createdTimestamp, setCreatedTimestamp] = useState<string>('');

  const { isProcessing, progress, startProgress, finishProgress, resetProgress } = useProgressAction();
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Helper to load 1st page preview and page count for a file
  const loadFileMetadata = async (item: PdfMergeItem) => {
    try {
      const { thumbnails, pageCount } = await extractPdfThumbnails(item.file, {
        maxPages: 1,
        scale: 0.7,
      });

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                thumbnailUrl: thumbnails[0]?.dataUrl || null,
                pageCount: pageCount,
                aspectRatio: thumbnails[0]?.aspectRatio || 1 / 1.414,
                loading: false,
              }
            : it
        )
      );
    } catch (err: any) {
      console.error('Failed to load PDF preview:', err);
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                loading: false,
                error: 'Could not load preview',
              }
            : it
        )
      );
    }
  };

  // Initial file selection from main UploadZone
  const handleInitialFilesSelected = (selectedFiles: File[]) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setError(null);
    setResult(null);

    const newItems: PdfMergeItem[] = selectedFiles.map((file, idx) => ({
      id: `merge-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      thumbnailUrl: null,
      pageCount: null,
      aspectRatio: 1 / 1.414,
      loading: true,
    }));

    setItems(newItems);
    newItems.forEach((item) => loadFileMetadata(item));
  };

  // Adding more files to existing list
  const handleAddMoreFiles = (addedFiles: FileList | File[] | null) => {
    if (!addedFiles) return;
    const oversized = Array.from(addedFiles).some((f) => f.size > 20 * 1024 * 1024);
    if (oversized) {
      setError('One or more files exceeded the 20 MB upload limit per file.');
    }
    const filesArray = Array.from(addedFiles).filter(
      (f) => (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) && f.size <= 20 * 1024 * 1024
    );
    if (filesArray.length === 0) return;

    if (!oversized) setError(null);
    const newItems: PdfMergeItem[] = filesArray.map((file, idx) => ({
      id: `merge-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      thumbnailUrl: null,
      pageCount: null,
      aspectRatio: 1 / 1.414,
      loading: true,
    }));

    setItems((prev) => [...prev, ...newItems]);
    newItems.forEach((item) => loadFileMetadata(item));

    if (addFileInputRef.current) {
      addFileInputRef.current.value = '';
    }
  };

  // Reorder items
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setItems(newItems);
  };

  // Reverse list order
  const handleReverseOrder = () => {
    setItems((prev) => [...prev].reverse());
  };

  // Remove single item
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Reset entire tool
  const handleReset = () => {
    if (result?.dataUrl && result.dataUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(result.dataUrl);
      } catch {}
    }
    setItems([]);
    setResult(null);
    setError(null);
    setZoomItem(null);
    setShowResultPreviewModal(false);
    setCreatedTimestamp('');
    scrollToTool();
  };

  // Download merged file
  const handleDownload = () => {
    if (!result?.dataUrl) return;
    const downloadFilename = result.filename || 'merged-file.pdf';
    const link = document.createElement('a');
    link.href = result.dataUrl;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...items];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setItems(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Execute merge
  const handleProcess = async () => {
    if (items.length < 2) {
      setError('Please upload at least 2 PDF documents to merge.');
      return;
    }

    const isAnyLoading = items.some((it) => it.loading);
    if (isAnyLoading) {
      setError('Please wait for document thumbnails and page counts to finish loading.');
      return;
    }

    setError(null);
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    startProgress();
    setResult(null);

    // 1. Client-Side High Performance Merge via pdf-lib
    // Running in the browser avoids the 4.5MB server upload limit (HTTP 413 "Request Entity Too Large")
    // and seamlessly preserves all international languages (Arabic, Chinese, Japanese, Hebrew, Cyrillic, Hindi, etc.)
    // because page dictionary objects, fonts, and CMaps are copied losslessly without re-encoding.
    try {
      const mergedDoc = await PDFDocument.create();

      for (const item of items) {
        try {
          const arrayBuffer = await item.file.arrayBuffer();
          const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          const pageIndices = srcDoc.getPageIndices();
          if (pageIndices.length === 0) continue;

          const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
          copiedPages.forEach((page) => mergedDoc.addPage(page));
        } catch (fileErr: any) {
          console.error(`Error loading PDF "${item.file.name}":`, fileErr);
          const msg = fileErr?.message || '';
          if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypt')) {
            throw new Error(`"${item.file.name}" is password-protected or encrypted. Please remove the password before merging.`);
          }
          throw new Error(`Unable to read "${item.file.name}". Please ensure it is a valid, uncorrupted PDF document.`);
        }
      }

      const pageCount = mergedDoc.getPageCount();
      if (pageCount === 0) {
        throw new Error('No readable pages found across the selected PDF files.');
      }

      const mergedBytes = await mergedDoc.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

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

      await finishProgress(() => {
        setResult({
          success: true,
          filename: 'merged-file.pdf',
          pageCount,
          originalSize: totalOriginalSize,
          fileSize: mergedBytes.length,
          dataUrl: blobUrl,
        });
      });
      return;
    } catch (clientErr: any) {
      console.warn('Client merge error, checking server fallback:', clientErr);

      if (
        clientErr?.message?.includes('password-protected') ||
        clientErr?.message?.includes('valid, uncorrupted PDF document')
      ) {
        resetProgress();
        setError(clientErr.message);
        return;
      }

      // 2. Fallback to API if client environment encounters an unexpected issue
      try {
        const formData = new FormData();
        items.forEach((item) => {
          formData.append('files', item.file);
        });

        const res = await fetch('/api/merge-pdf', {
          method: 'POST',
          body: formData,
        });

        const textResponse = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(textResponse);
        } catch {
          if (res.status === 413 || textResponse.toLowerCase().includes('entity too large')) {
            throw new Error('The combined PDF files exceed the maximum upload limit. Please try merging smaller files or fewer documents at once.');
          }
          throw new Error('Server returned an unexpected response. Please try again.');
        }

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Merge failed');
        }

        const now = new Date();
        const dateLocale = language || 'en';
        const dateStr = now.toLocaleDateString(dateLocale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const timeStr = now.toLocaleTimeString(dateLocale, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        setCreatedTimestamp(`${dateStr} • ${timeStr}`);

        await finishProgress(() => {
          setResult({
            ...data,
            filename: data.filename || 'merged-file.pdf',
          });
        });
      } catch (err: any) {
        resetProgress();
        setError(err.message || clientErr.message || 'Error occurred while merging PDFs.');
      }
    }
  };

  // Calculations
  const totalOriginalSize = items.reduce((acc, it) => acc + it.file.size, 0);
  const totalPagesCount = items.reduce((acc, it) => acc + (it.pageCount || 0), 0);
  const allThumbnailsLoaded = items.every((it) => !it.loading);

  return (
    <div className="w-full space-y-6">
      {/* Hidden file input for adding more PDFs */}
      <input
        ref={addFileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleAddMoreFiles(e.target.files)}
      />

      {/* Initial Upload State */}
      {items.length === 0 && (
        <UploadZone
          accept=".pdf,application/pdf"
          multiple={true}
          maxFiles={20}
          files={[]}
          onFilesSelected={handleInitialFilesSelected}
          title={t('dropMultiplePdfs', 'Drop multiple PDF files to merge')}
          subtitle={t('mergeSubtitle', 'Combine 2 to 20 documents into a single PDF with visual previews')}
        />
      )}

      {/* Active Workspace */}
      {items.length > 0 && !result && (
        <div className="w-full space-y-5 animate-in fade-in duration-200">
          {/* Top Integrated Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-2xl bg-base-200/60 backdrop-blur-md border border-base-300/80 shadow-xs">
            {/* ROW 1 ON MOBILE / LEFT ON DESKTOP: Tool Title & Summary Badges */}
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-ghost btn-xs sm:btn-sm btn-circle text-base-content/70 hover:text-base-content shrink-0"
                  title={t('startOverClearAll', 'Start over / Clear all')}
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <span className="font-extrabold text-xs sm:text-base text-base-content truncate">
                  {t('mergePdf', 'Merge PDFs')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <span className="badge badge-primary font-bold text-[10px] sm:text-xs py-0.5 sm:py-1">
                  {items.length} {items.length === 1 ? t('doc', 'Doc') : t('docs', 'Docs')}
                </span>
                {allThumbnailsLoaded && totalPagesCount > 0 && (
                  <span className="badge badge-ghost font-semibold text-[10px] sm:text-xs py-0.5 sm:py-1 text-base-content/70 hidden xs:inline-flex">
                    {totalPagesCount} {t('pages', 'Pages')}
                  </span>
                )}
              </div>
            </div>

            {/* ROW 2 ON MOBILE / RIGHT ON DESKTOP: Actions (Add PDF, Reverse, View Modes) */}
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t border-base-300/40 sm:border-t-0">
              <button
                type="button"
                onClick={() => addFileInputRef.current?.click()}
                className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold text-xs text-primary gap-1 sm:gap-1.5 hover:bg-primary/10 px-2 sm:px-3"
                title={t('addMorePdfs', 'Add more PDF documents')}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{t('addDocument', 'Add Document')}</span>
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleReverseOrder}
                  className="btn btn-ghost btn-xs sm:btn-sm rounded-xl text-xs text-base-content/70 gap-1 hover:bg-base-300/50 px-2 sm:px-3"
                  title={t('reverseOrder', 'Reverse document order')}
                  disabled={items.length < 2}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('reverseOrder', 'Reverse')}</span>
                </button>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-base-100 rounded-xl p-0.5 border border-base-300">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1 sm:p-1.5 rounded-lg transition-all ${
                      viewMode === 'grid'
                        ? 'bg-primary text-primary-content shadow-xs'
                        : 'text-base-content/60 hover:text-base-content'
                    }`}
                    title={t('gridView', 'Grid View')}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1 sm:p-1.5 rounded-lg transition-all ${
                      viewMode === 'list'
                        ? 'bg-primary text-primary-content shadow-xs'
                        : 'text-base-content/60 hover:text-base-content'
                    }`}
                    title={t('listView', 'List View')}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Condition: Exactly 1 PDF uploaded prompt banner */}
          {items.length === 1 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FilePlus2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">
                    1 PDF uploaded &mdash; {t('uploadNextPdfDoc', 'Please upload the next PDF to merge')}
                  </p>
                  <p className="text-xs opacity-80 mt-0.5">
                    {t('mergeRequires2Pdfs', 'Merging requires at least 2 PDF documents. Upload another PDF below to enable merging.')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => addFileInputRef.current?.click()}
                className="btn btn-warning btn-sm rounded-xl font-bold gap-1.5 shrink-0 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                {t('uploadNextPdf', 'Upload Next PDF')}
              </button>
            </div>
          )}

          {/* Instructions sub-header */}
          <div className="px-2 flex items-center justify-between text-xs text-base-content/60">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary/70 animate-pulse"></span>
              {t('dragDropMergeSequence', 'Drag & drop cards or use arrows to change the merge sequence')}
            </span>
            <span className="text-[11px] text-base-content/50">
              {t('totalSize', 'Total size')}: {formatBytes(totalOriginalSize)}
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="alert alert-error text-xs rounded-2xl shadow-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 py-2">
              {items.map((item, index) => {
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`group relative flex flex-col rounded-2xl bg-base-100 border transition-all duration-200 cursor-grab active:cursor-grabbing select-none shadow-sm hover:shadow-md ${
                      isDragging ? 'opacity-30 scale-95' : ''
                    } ${
                      isDragOver
                        ? 'border-primary ring-2 ring-primary ring-offset-2 scale-[1.02]'
                        : 'border-base-300 hover:border-primary/50'
                    }`}
                  >
                    {/* Top Item Badge Bar */}
                    <div className="p-2.5 pb-1.5 flex items-center justify-between gap-1">
                      <span className="w-6 h-6 rounded-lg bg-primary text-primary-content font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        #{index + 1}
                      </span>

                      {/* Page Count Pill */}
                      {item.loading ? (
                        <span className="badge badge-ghost badge-sm text-[10px] gap-1 text-base-content/60">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          {t('pages', 'Pages')}...
                        </span>
                      ) : item.pageCount !== null ? (
                        <span className="badge badge-primary/10 text-primary border-primary/20 font-bold text-[11px]">
                          {item.pageCount} {item.pageCount === 1 ? t('page', 'Page') : t('pages', 'Pages')}
                        </span>
                      ) : null}

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error hover:bg-error/10"
                        title={t('removeDocument', 'Remove document')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 1st Page Thumbnail Container */}
                    <div className="px-2.5 py-1.5 flex items-center justify-center">
                      <div
                        style={{ aspectRatio: item.aspectRatio ? `${item.aspectRatio}` : '1 / 1.414' }}
                        className="relative w-full bg-white rounded-none overflow-hidden border border-base-300 flex items-center justify-center group/thumb"
                      >
                        {item.loading ? (
                          <div className="flex flex-col items-center justify-center gap-2 p-3 text-center bg-base-200/40 w-full h-full">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            <span className="text-xs font-semibold text-base-content/70">
                              {t('loading', 'Loading...')}
                            </span>
                          </div>
                        ) : item.thumbnailUrl ? (
                          <>
                            <img
                              src={item.thumbnailUrl}
                              alt={`Page 1 of ${item.file.name}`}
                              className="w-full h-full object-fill bg-white"
                            />
                            {/* Hover overlay with zoom */}
                            <div className="absolute inset-0 bg-base-900/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomItem(item);
                                }}
                                className="btn btn-circle btn-xs bg-base-100/90 text-base-content hover:bg-base-100 border-none shadow-md"
                                title={t('zoomFirstPage', 'Zoom 1st page preview')}
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center text-base-content/40">
                            <FileText className="w-8 h-8" />
                            <span className="text-[10px]">{t('previewUnavailable', 'Preview unavailable')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Document Meta & Reorder Footer */}
                    <div className="p-2.5 pt-1 flex flex-col gap-1.5">
                      <div className="overflow-hidden">
                        <p
                          className="text-xs font-bold text-base-content truncate"
                          title={item.file.name}
                        >
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-base-content/50 mt-0.5">
                          {formatBytes(item.file.size)}
                        </p>
                      </div>

                      {/* Quick Move Reorder Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-base-200">
                        <span className="text-[10px] text-base-content/40 font-medium">{t('order', 'Order')}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveItem(index, 'up')}
                            className="btn btn-ghost btn-xs btn-circle text-base-content/60 disabled:opacity-20"
                            title={t('moveEarlier', 'Move earlier in merge order')}
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === items.length - 1}
                            onClick={() => moveItem(index, 'down')}
                            className="btn btn-ghost btn-xs btn-circle text-base-content/60 disabled:opacity-20"
                            title={t('moveLater', 'Move later in merge order')}
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Next PDF Card in Grid */}
              <div
                onClick={() => addFileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleAddMoreFiles(e.dataTransfer.files);
                }}
                className={`group min-h-[220px] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center gap-2 select-none ${
                  items.length === 1
                    ? 'border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500 animate-pulse'
                    : 'border-base-300 hover:border-primary/60 bg-base-200/30 hover:bg-base-200/60'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs ${
                    items.length === 1
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-xs sm:text-sm text-base-content">
                    {items.length === 1 ? t('addNextPdf', 'Add Next PDF') : t('addDocument', 'Add Document')}
                  </p>
                  <p className="text-[11px] text-base-content/50 mt-0.5">
                    {t('clickBrowseOrDrop', 'Click to browse or drop file here')} · 20 MB upload limit per file
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className="space-y-2.5 py-1">
              {items.map((item, index) => {
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex items-center justify-between p-3 rounded-2xl bg-base-100 border transition-all cursor-grab active:cursor-grabbing shadow-xs ${
                      isDragging ? 'opacity-30 scale-95' : ''
                    } ${
                      isDragOver
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-base-300 hover:border-primary/40'
                    }`}
                  >
                    {/* Left: Index + 1st Page Thumbnail + Details */}
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <span className="w-7 h-7 rounded-xl bg-primary text-primary-content font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        #{index + 1}
                      </span>

                      {/* Compact 1st Page Thumbnail */}
                      <div
                        onClick={() => item.thumbnailUrl && setZoomItem(item)}
                        className="relative w-12 h-16 rounded-lg bg-base-200 overflow-hidden border border-base-200 shrink-0 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        title={t('clickToViewPage', 'Click to view 1st page')}
                      >
                        {item.loading ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        ) : item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={`Preview ${item.file.name}`}
                            className="w-full h-full object-contain bg-white"
                          />
                        ) : (
                          <FileText className="w-5 h-5 text-base-content/40" />
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="overflow-hidden">
                        <p className="text-xs sm:text-sm font-bold text-base-content truncate">
                          {item.file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-base-content/50">
                            {formatBytes(item.file.size)}
                          </span>
                          <span className="text-base-content/30 text-xs">•</span>
                          {item.loading ? (
                            <span className="text-[11px] text-base-content/50 flex items-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              {t('loadingPages', 'Loading pages...')}
                            </span>
                          ) : item.pageCount !== null ? (
                            <span className="badge badge-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                              {item.pageCount} {item.pageCount === 1 ? t('page', 'Page') : t('pages', 'Pages')}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right: Reorder & Remove Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveItem(index, 'up')}
                        className="btn btn-ghost btn-xs btn-circle text-base-content/60 disabled:opacity-20"
                        title={t('moveUp', 'Move Up')}
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === items.length - 1}
                        onClick={() => moveItem(index, 'down')}
                        className="btn btn-ghost btn-xs btn-circle text-base-content/60 disabled:opacity-20"
                        title={t('moveDown', 'Move Down')}
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error hover:bg-error/10"
                        title={t('remove', 'Remove')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add Next PDF Row in List */}
              <div
                onClick={() => addFileInputRef.current?.click()}
                className={`p-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-semibold ${
                  items.length === 1
                    ? 'border-amber-500/60 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10'
                    : 'border-base-300 hover:border-primary/50 text-base-content/70 hover:text-primary hover:bg-base-200/50'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {items.length === 1 ? t('uploadNextPdfDoc', 'Upload Next PDF Document') : t('addAnotherPdfDoc', 'Add Another PDF Document')}
                </span>
              </div>
            </div>
          )}

          {/* Bottom Primary Merge Button */}
          <div className="pt-2">
            <ProcessingButton
              onClick={handleProcess}
              isProcessing={isProcessing}
              progress={progress}
              disabled={items.length < 2 || !allThumbnailsLoaded}
              loadingLabel={t('merging', 'Merging')}
            >
              <Layers className="w-5 h-5" />
              <span className="text-base sm:text-lg font-bold">{t('mergePdfBtn', 'Merge PDF Files')}</span>
            </ProcessingButton>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Area: Centered on mobile, left-aligned on desktop */}
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-3 sm:gap-3.5">
            <div className="w-11 h-11 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs sm:mt-0.5">
              <FileCheck2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg sm:text-2xl text-base-content leading-snug sm:leading-tight">
                {t('pdfMergedSuccess', 'Your PDF has been merged successfully!')}
              </h3>
              <p className="text-xs sm:text-sm text-base-content/60 leading-relaxed max-w-sm sm:max-w-none">
                {t('filesCombinedDesc', 'Your files have been combined into one PDF. You can now download it or perform other actions below.')}
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
                      {result.filename || 'merged-file.pdf'}
                    </h4>
                    <span className="badge badge-sm badge-ready border font-bold">
                      {t('ready', 'Ready')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-base-content/60 mt-0.5">
                    {result.pageCount} {result.pageCount === 1 ? t('page', 'page') : t('pages', 'pages')}  •  {formatBytes(result.fileSize)}  •  PDF
                  </p>
                </div>
              </div>

              {/* Merged from X files pill */}
              <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-base-100 border border-base-200 shadow-xs shrink-0">
                <Layers className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="text-[10px] text-base-content/50 uppercase font-bold tracking-wider leading-none">{t('mergedFrom', 'Merged from')}</div>
                  <div className="font-extrabold text-xs sm:text-sm text-base-content mt-0.5 leading-none">{items.length} {items.length === 1 ? t('file', 'file') : t('files', 'files')}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="btn btn-primary btn-md rounded-xl font-bold text-white shadow-md shadow-primary/20 gap-2 px-3 sm:px-6 flex-1 sm:flex-none justify-center flex-row flex-nowrap whitespace-nowrap"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span className="inline sm:hidden">{t('download', 'Download')}</span>
                  <span className="hidden sm:inline">{t('downloadFile', 'Download File')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowResultPreviewModal(true)}
                  className="btn btn-ghost border border-base-300 btn-md rounded-xl font-semibold gap-2 px-3 sm:px-5 text-base-content/70 hover:text-base-content hover:bg-base-200 flex-1 sm:flex-none justify-center flex-row flex-nowrap whitespace-nowrap"
                >
                  <Eye className="w-4 h-4 shrink-0" />
                  <span>{t('preview', 'Preview')}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="btn btn-ghost border border-base-300 btn-md rounded-xl font-semibold gap-1.5 px-4 text-base-content/70 hover:text-base-content hover:bg-base-200 w-full sm:w-auto justify-center flex-row flex-nowrap whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('mergeAnother', 'Merge Another')}</span>
              </button>
            </div>

            {/* File Details */}
            <div className="pt-4 border-t border-base-200 space-y-3.5">
              <h5 className="font-bold text-sm sm:text-base text-base-content">{t('fileDetails', 'File Details')}</h5>
              <div className="space-y-2.5 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                    <FileText className="w-4 h-4 text-base-content/40" />
                    <span>{t('fileName', 'File name')}</span>
                  </span>
                  <span className="text-base-content/40">:</span>
                  <span className="font-semibold text-base-content truncate">{result.filename || 'merged-file.pdf'}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                    <HardDrive className="w-4 h-4 text-base-content/40" />
                    <span>{t('fileSize', 'File size')}</span>
                  </span>
                  <span className="text-base-content/40">:</span>
                  <span className="font-semibold text-base-content">{formatBytes(result.fileSize)}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                    <Layers className="w-4 h-4 text-base-content/40" />
                    <span>{t('pages', 'Pages')}</span>
                  </span>
                  <span className="text-base-content/40">:</span>
                  <span className="font-semibold text-base-content">{result.pageCount} {t('pages', 'pages')}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-base-content/60 w-28 sm:w-32 shrink-0">
                    <Calendar className="w-4 h-4 text-base-content/40" />
                    <span>{t('created', 'Created')}</span>
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
      {showResultPreviewModal && result?.dataUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
          onClick={() => setShowResultPreviewModal(false)}
        >
          <div
            className="relative bg-base-100 rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 max-w-4xl w-full h-[92dvh] sm:h-[85vh] flex flex-col gap-2 sm:gap-3 shadow-2xl border border-base-300 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-base-200 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 mr-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                <h5 className="font-bold text-xs sm:text-base text-base-content truncate">
                  {result.filename || 'merged-file.pdf'}
                </h5>
                <span className="badge badge-xs sm:badge-sm font-semibold shrink-0 hidden sm:inline-flex">{result.pageCount} {t('pages', 'Pages')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="btn btn-xs btn-primary font-bold gap-1 rounded-lg px-2 sm:px-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('download', 'Download')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowResultPreviewModal(false)}
                  className="btn btn-ghost btn-xs btn-circle"
                  aria-label={t('close', 'Close modal')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0 bg-base-200/50 rounded-xl sm:rounded-2xl overflow-hidden p-1.5 sm:p-2 flex flex-col">
              <PdfPreviewModalViewer
                dataUrl={result.dataUrl}
                filename="merged.pdf"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1st Page Zoom Modal */}
      {zoomItem && zoomItem.thumbnailUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
          onClick={() => setZoomItem(null)}
        >
          <div
            className="relative bg-base-100 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 max-w-2xl w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col items-center gap-3 sm:gap-4 shadow-2xl border border-base-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between">
              <div>
                <h5 className="font-bold text-sm text-base-content truncate max-w-md">
                  {zoomItem.file.name}
                </h5>
                <p className="text-xs text-base-content/60">
                  Preview of Page 1 • Total {zoomItem.pageCount || '?'} Pages
                </p>
              </div>
              <button
                type="button"
                onClick={() => setZoomItem(null)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Image */}
            <div className="flex-1 w-full overflow-auto flex items-center justify-center p-2 bg-base-200/50 rounded-2xl">
              <img
                src={zoomItem.thumbnailUrl}
                alt="Page 1 Preview"
                className="max-h-[68vh] object-contain rounded-lg shadow-lg bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
