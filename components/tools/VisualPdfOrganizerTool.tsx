'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  FileCheck2,
  Eye,
  HardDrive,
  Calendar,
  Layers,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import PdfPreviewModalViewer from '@/components/ui/PdfPreviewModalViewer';
import { extractPdfThumbnails } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';
import { safeFetchJson } from '@/lib/utils/apiHelper';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface VisualPageItem {
  id: string;
  fileIndex: number; // 0-based index of source file
  originalIndex: number; // 0-based index in original file (-1 for blank)
  pageNumber: number; // 1-based display index
  dataUrl: string;
  originalDataUrl?: string; // Pristine unrotated thumbnail
  rotation: number; // 0, 90, 180, 270
  selected: boolean;
  aspectRatio: number; // Current visual aspect ratio (width / height)
  originalAspectRatio?: number; // Pristine unrotated aspect ratio
  isBlank?: boolean;
  docName?: string;
}

/**
 * Fast off-screen canvas rotation for crisp, unstretched page thumbnails.
 * Always renders from pristine unrotated source onto an exact-dimension canvas.
 */
function rotateImageDataUrl(dataUrl: string, degrees: number): Promise<string> {
  const normDeg = ((degrees % 360) + 360) % 360;
  if (normDeg === 0 || !dataUrl) {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const isSideways = normDeg === 90 || normDeg === 270;
        canvas.width = isSideways ? img.height : img.width;
        canvas.height = isSideways ? img.width : img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((normDeg * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        console.warn('Canvas rotation fallback:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
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
  const { t } = useLanguage();

  const localizedTitle =
    initialMode === 'delete'
      ? t('deletePdfPages', title)
      : initialMode === 'extract'
      ? t('extractPdfPages', title)
      : initialMode === 'rotate'
      ? t('rotatePdf', title)
      : initialMode === 'split'
      ? t('splitPdf', title)
      : t('organizePdf', title);

  const localizedDescription =
    initialMode === 'delete'
      ? t('deletePdfPagesDesc', description)
      : initialMode === 'extract'
      ? t('extractPdfPagesDesc', description)
      : initialMode === 'rotate'
      ? t('rotatePdfDesc', description)
      : initialMode === 'split'
      ? t('splitPdfDesc', description)
      : t('organizePdfDesc', description);

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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up any pending background extraction on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle initial file selection with instant workspace unlock and progressive thumbnail streaming
  const handleFileSelected = async (selectedFile: File) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setFiles([selectedFile]);
    setError(null);
    setResultData(null);
    setLoadingThumbnails(true);
    setThumbnailProgress({ loaded: 0, total: 0 });

    try {
      await extractPdfThumbnails(selectedFile, {
        signal: controller.signal,
        onDocLoaded: (total) => {
          if (controller.signal.aborted) return;
          // Instantly unlock workspace with page items in 0.05 seconds!
          const skeletonPages: VisualPageItem[] = Array.from({ length: total }, (_, idx) => ({
            id: `page-0-${idx}-${Date.now()}`,
            fileIndex: 0,
            originalIndex: idx,
            pageNumber: idx + 1,
            dataUrl: '',
            originalDataUrl: '',
            rotation: 0,
            selected: initialMode === 'delete' || initialMode === 'extract' ? false : true,
            aspectRatio: 1 / 1.414,
            originalAspectRatio: 1 / 1.414,
            docName: selectedFile.name,
          }));

          setPages(skeletonPages);
          setLoadingThumbnails(false);
          setThumbnailProgress({ loaded: 0, total });
        },
        onPageReady: (thumb) => {
          if (controller.signal.aborted) return;
          setPages((prev) =>
            prev.map((p) => {
              if (p.fileIndex === 0 && p.originalIndex === thumb.pageNumber - 1) {
                const curRot = p.rotation || 0;
                const finalAspect = curRot % 180 !== 0 ? 1 / thumb.aspectRatio : thumb.aspectRatio;
                return {
                  ...p,
                  dataUrl: thumb.dataUrl,
                  originalDataUrl: thumb.dataUrl,
                  aspectRatio: finalAspect,
                  originalAspectRatio: thumb.aspectRatio,
                };
              }
              return p;
            })
          );
        },
        onProgress: (loaded, total) => {
          if (controller.signal.aborted) return;
          setThumbnailProgress({ loaded, total });
        },
      });
    } catch (err: any) {
      if (controller.signal.aborted) return;
      console.error('Thumbnail error:', err);
      setError('Could not render PDF pages. Please ensure the file is a valid, unencrypted PDF.');
    } finally {
      if (!controller.signal.aborted) {
        setLoadingThumbnails(false);
      }
    }
  };

  // Handle adding new document pages without deleting existing ones
  const handleAddDocumentPages = async (newFile: File) => {
    setError(null);
    if (!newFile) return;
    if (newFile.size > 20 * 1024 * 1024) {
      setError('Please choose a file smaller than 20 MB.');
      return;
    }

    const nextFileIndex = files.length;
    setFiles((prev) => [...prev, newFile]);
    const currentSignal = abortControllerRef.current?.signal;

    try {
      await extractPdfThumbnails(newFile, {
        signal: currentSignal,
        onDocLoaded: (total) => {
          if (currentSignal?.aborted) return;
          const additionalPages: VisualPageItem[] = Array.from({ length: total }, (_, idx) => ({
            id: `page-${nextFileIndex}-${idx}-${Date.now()}`,
            fileIndex: nextFileIndex,
            originalIndex: idx,
            pageNumber: pages.length + idx + 1,
            dataUrl: '',
            originalDataUrl: '',
            rotation: 0,
            selected: initialMode === 'delete' || initialMode === 'extract' ? false : true,
            aspectRatio: 1 / 1.414,
            originalAspectRatio: 1 / 1.414,
            docName: newFile.name,
          }));

          setPages((prev) => {
            const combined = [...prev, ...additionalPages];
            return combined.map((item, idx) => ({
              ...item,
              pageNumber: idx + 1,
            }));
          });
          setThumbnailProgress({ loaded: 0, total });
        },
        onPageReady: (thumb) => {
          if (currentSignal?.aborted) return;
          setPages((prev) =>
            prev.map((p) => {
              if (p.fileIndex === nextFileIndex && p.originalIndex === thumb.pageNumber - 1) {
                const curRot = p.rotation || 0;
                const finalAspect = curRot % 180 !== 0 ? 1 / thumb.aspectRatio : thumb.aspectRatio;
                return {
                  ...p,
                  dataUrl: thumb.dataUrl,
                  originalDataUrl: thumb.dataUrl,
                  aspectRatio: finalAspect,
                  originalAspectRatio: thumb.aspectRatio,
                };
              }
              return p;
            })
          );
        },
        onProgress: (loaded, total) => {
          if (currentSignal?.aborted) return;
          setThumbnailProgress({ loaded, total });
        },
      });
    } catch (err: any) {
      if (currentSignal?.aborted) return;
      console.error('Thumbnail error adding document:', err);
      setError('Could not render pages from the added PDF. Please ensure the file is a valid, unencrypted PDF.');
    }
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setFiles([]);
    setPages([]);
    setLoadingThumbnails(false);
    setThumbnailProgress({ loaded: 0, total: 0 });
    setProcessing(false);
    setResultData(null);
    setError(null);
    setSplitCustomCuts(new Set());
    setShowResultPreviewModal(false);
    setCreatedTimestamp('');
    setZoomPage(null);
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
  const rotatePage = async (id: string, angleDelta: number) => {
    const target = pages.find((p) => p.id === id);
    if (!target) return;

    const nextRot = (target.rotation + angleDelta + 360) % 360;
    const baseAspect = target.originalAspectRatio || (target.rotation % 180 !== 0 ? 1 / target.aspectRatio : target.aspectRatio) || 1 / 1.414;
    const nextAspect = nextRot % 180 !== 0 ? 1 / baseAspect : baseAspect;
    const baseDataUrl = target.originalDataUrl || target.dataUrl;

    // Fast sync update for rotation and aspect ratio
    setPages((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              rotation: nextRot,
              aspectRatio: nextAspect,
            }
          : p
      )
    );

    // Fast off-screen canvas rotation for pristine, unstretched image
    if (baseDataUrl) {
      const nextDataUrl = await rotateImageDataUrl(baseDataUrl, nextRot);
      setPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, dataUrl: nextDataUrl } : p))
      );
    }
  };

  // Rotate selected pages
  const rotateSelected = async (angleDelta: number) => {
    const targets = pages.filter((p) => p.selected);
    if (targets.length === 0) return;

    // Fast sync update for rotation and aspect ratio
    const updatedSync = pages.map((p) => {
      if (!p.selected) return p;
      const nextRot = (p.rotation + angleDelta + 360) % 360;
      const baseAspect = p.originalAspectRatio || (p.rotation % 180 !== 0 ? 1 / p.aspectRatio : p.aspectRatio) || 1 / 1.414;
      const nextAspect = nextRot % 180 !== 0 ? 1 / baseAspect : baseAspect;
      return {
        ...p,
        rotation: nextRot,
        aspectRatio: nextAspect,
      };
    });
    setPages(updatedSync);

    // Fast parallel canvas rotation
    const updatedImages = await Promise.all(
      updatedSync.map(async (p) => {
        if (!p.selected) return p;
        const baseDataUrl = p.originalDataUrl || p.dataUrl;
        if (!baseDataUrl) return p;
        const nextDataUrl = await rotateImageDataUrl(baseDataUrl, p.rotation);
        return {
          ...p,
          dataUrl: nextDataUrl,
        };
      })
    );
    setPages(updatedImages);
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
      originalDataUrl: blankDataUrl,
      rotation: 0,
      selected: true,
      aspectRatio: 595 / 842,
      originalAspectRatio: 595 / 842,
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

      // 1. Client-Side High Performance Extraction & Organization via pdf-lib
      // Runs directly in browser, bypassing HTTP 413 "Request Entity Too Large",
      // and natively preserves all international character sets & fonts.
      try {
        const { PDFDocument, degrees } = await import('pdf-lib');
        const JSZip = (await import('jszip')).default;

        const srcDocs = await Promise.all(
          files.map(async (f) => {
            const ab = await f.arrayBuffer();
            return PDFDocument.load(ab, { ignoreEncryption: true });
          })
        );

        const baseName = (files[0]?.name || 'document').replace(/\.[^/.]+$/, '');
        const isSeparate = toolTab === 'split' || separatePdfs;

        let resultUrl = '';
        let resultSize = 0;
        let resultMime = 'application/pdf';
        let resultFilename = `${baseName}_extracted.pdf`;

        if (isSeparate) {
          const zip = new JSZip();
          for (let i = 0; i < pagesToInclude.length; i++) {
            const item = pagesToInclude[i];
            const singleDoc = await PDFDocument.create();

            if (item.isBlank || item.fileIndex < 0 || item.pageIndex < 0) {
              singleDoc.addPage([595, 842]);
            } else {
              const srcDoc = srcDocs[item.fileIndex] || srcDocs[0];
              const [copiedPage] = await singleDoc.copyPages(srcDoc, [item.pageIndex]);
              if (item.rotation && item.rotation !== 0) {
                const currentRot = copiedPage.getRotation().angle;
                copiedPage.setRotation(degrees((currentRot + item.rotation) % 360));
              }
              singleDoc.addPage(copiedPage);
            }

            const pageBytes = await singleDoc.save({ useObjectStreams: true });
            zip.file(`${baseName}_page_${i + 1}.pdf`, pageBytes);
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          resultUrl = URL.createObjectURL(zipBlob);
          resultSize = zipBlob.size;
          resultMime = 'application/zip';
          resultFilename = `${baseName}_pages.zip`;
        } else {
          const outDoc = await PDFDocument.create();

          for (let i = 0; i < pagesToInclude.length; i++) {
            const item = pagesToInclude[i];
            if (item.isBlank || item.fileIndex < 0 || item.pageIndex < 0) {
              outDoc.addPage([595, 842]);
            } else {
              const srcDoc = srcDocs[item.fileIndex] || srcDocs[0];
              const [copiedPage] = await outDoc.copyPages(srcDoc, [item.pageIndex]);
              if (item.rotation && item.rotation !== 0) {
                const currentRot = copiedPage.getRotation().angle;
                copiedPage.setRotation(degrees((currentRot + item.rotation) % 360));
              }
              outDoc.addPage(copiedPage);
            }
          }

          const outBytes = await outDoc.save({ useObjectStreams: true });
          const pdfBlob = new Blob([outBytes as unknown as BlobPart], { type: 'application/pdf' });
          resultUrl = URL.createObjectURL(pdfBlob);
          resultSize = pdfBlob.size;
          resultMime = 'application/pdf';
          const modeSuffix = initialMode === 'extract' ? 'extracted' : initialMode === 'delete' ? 'trimmed' : 'organized';
          resultFilename = `${baseName}_${modeSuffix}.pdf`;
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
          dataUrl: resultUrl,
          filename: resultFilename,
          size: resultSize,
          mimeType: resultMime,
          pageCount: pagesToInclude.length,
        });
        return;
      } catch (clientErr: any) {
        console.warn('Client-side organize failed, falling back to API:', clientErr);

        // 2. Server API Fallback with safe JSON parsing
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

        const data = await safeFetchJson(res);

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
      }
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
            accept=".pdf,application/pdf"
            maxFiles={1}
            maxSizeMb={20}
            title={localizedTitle}
            subtitle={localizedDescription}
            onFilesSelected={(files) => handleFileSelected(files[0])}
          />
        </div>
      )}

      {/* Initial PDF Parsing (brief 50ms) */}
      {loadingThumbnails && pages.length === 0 && (
        <div className="max-w-xl mx-auto p-8 rounded-3xl bg-base-200/50 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-base-content">{t('readingPdfDocument', 'Reading PDF Document...')}</h3>
            <p className="text-xs text-base-content/60">
              {t('extractingStructure', 'Extracting document structure and pages')}
            </p>
          </div>
        </div>
      )}

      {/* Seamless, Natural Workspace - Opens immediately as soon as pages are parsed! */}
      {file && pages.length > 0 && !resultData && (
        <div className="w-full space-y-5">
          {/* Progressive Preview Rendering Banner */}
          {thumbnailProgress.total > 0 && thumbnailProgress.loaded < thumbnailProgress.total && (
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-primary animate-spin shrink-0" />
                <span className="font-semibold text-base-content">
                  {t('generatingPreviews', 'Generating page previews')}: <strong>{thumbnailProgress.loaded}</strong> {t('of', 'of')} <strong>{thumbnailProgress.total}</strong>
                  <span className="hidden sm:inline font-normal text-base-content/70 ml-1.5">— {t('immediatePdfActions', 'You can select, organize, or extract pages immediately.')}</span>
                </span>
              </div>
              <div className="w-full sm:w-48 shrink-0">
                <progress
                  className="progress progress-primary w-full h-1.5"
                  value={thumbnailProgress.loaded}
                  max={thumbnailProgress.total}
                />
              </div>
            </div>
          )}
          {/* Top Integrated Action Bar - Responsive 2-Row Layout on Mobile, Single Row on Desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 lg:gap-4 p-2.5 sm:p-3 lg:p-4 rounded-2xl bg-base-200/60 backdrop-blur-md border border-base-300/80 shadow-xs sm:flex-wrap lg:flex-nowrap">
            {/* ROW 1 ON MOBILE / LEFT ON DESKTOP: Title, Reset & Edit Tools (Add, Rotate, Delete) */}
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink sm:shrink-0">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-ghost btn-xs sm:btn-sm btn-circle text-base-content/70 hover:text-base-content shrink-0"
                  title={t('uploadDifferentFile', 'Upload different file')}
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <span className="font-extrabold text-xs sm:text-sm lg:text-base text-base-content truncate max-w-[120px] xs:max-w-[150px] sm:max-w-[150px] md:max-w-[180px] lg:max-w-none">
                  {localizedTitle || (toolTab === 'split' ? t('split', 'Split') : t('extractPages', 'Extract Pages'))}
                </span>
              </div>

              {/* Action Pills: Add, Rotate Left, Rotate Right, Delete */}
              <div className="flex items-center gap-0.5 sm:gap-1 bg-base-100 p-0.5 sm:p-1 rounded-xl border border-base-300 shrink-0">
                {initialMode === 'organize' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setToolTab('split')}
                      className={`flex items-center gap-1 px-2 sm:px-2.5 lg:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        toolTab === 'split'
                          ? 'bg-primary text-primary-content shadow-xs'
                          : 'text-base-content/70 hover:text-base-content'
                      }`}
                    >
                      <Scissors className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">{t('split', 'Split')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setToolTab('extract')}
                      className={`flex items-center gap-1 px-2 sm:px-2.5 lg:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        toolTab === 'extract'
                          ? 'bg-primary text-primary-content shadow-xs'
                          : 'text-base-content/70 hover:text-base-content'
                      }`}
                    >
                      <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">{t('extract', 'Extract')}</span>
                    </button>

                    <div className="w-px h-3.5 bg-base-300 mx-0.5"></div>
                  </>
                )}

                <div className="dropdown dropdown-end">
                  <label
                    tabIndex={0}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-base-content/70 hover:bg-base-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] sm:text-xs">{t('add', 'Add')}</span>
                    <ChevronDown className="w-3 h-3 opacity-60 hidden sm:inline" />
                  </label>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-30 menu p-2 shadow-xl bg-base-100 rounded-2xl border border-base-300 w-48 text-xs space-y-1 mt-1"
                  >
                    <li>
                      <button type="button" onClick={() => insertBlankPage(pages.length)}>
                        <Plus className="w-4 h-4 text-primary" />
                        <span>{t('insertBlankPage', 'Insert Blank Page')}</span>
                      </button>
                    </li>
                    <li>
                      <button type="button" onClick={() => addFileInputRef.current?.click()}>
                        <FileText className="w-4 h-4 text-success" />
                        <span>{t('addDocumentPages', 'Add Document Pages')} (Max 20MB)</span>
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="w-px h-3.5 bg-base-300 mx-0.5 sm:mx-1"></div>

                <button
                  type="button"
                  onClick={() => rotateSelected(-90)}
                  disabled={selectedCount === 0}
                  className="p-1 sm:p-1.5 rounded-lg text-base-content/70 hover:bg-base-200 disabled:opacity-30"
                  title={t('rotateLeft', 'Rotate Left')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => rotateSelected(90)}
                  disabled={selectedCount === 0}
                  className="p-1 sm:p-1.5 rounded-lg text-base-content/70 hover:bg-base-200 disabled:opacity-30"
                  title={t('rotateRight', 'Rotate Right')}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={deleteSelected}
                  disabled={selectedCount === 0}
                  className="p-1 sm:p-1.5 rounded-lg text-error hover:bg-error/10 disabled:opacity-30"
                  title={t('deleteSelected', 'Delete Selected')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ROW 2 ON MOBILE / RIGHT ON DESKTOP: Options (Separate PDFs / Split) & Finish CTA Button */}
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 lg:gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t border-base-300/40 sm:border-t-0 shrink-0">
              {/* Output Options */}
              <div className="flex items-center shrink-0">
                {toolTab === 'split' ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-medium text-base-content/80 shrink-0">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={splitAfterEveryEnabled}
                        onChange={(e) => setSplitAfterEveryEnabled(e.target.checked)}
                        className="checkbox checkbox-xs checkbox-primary rounded"
                      />
                      <span className="text-[11px] sm:text-xs">{t('every', 'Every')}</span>
                    </label>

                    <div className="flex items-center border border-base-300 rounded-lg bg-base-100 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setSplitEveryN((n) => Math.max(1, n - 1))}
                        className="px-1.5 py-0.5 sm:px-2 sm:py-1 hover:bg-base-200 text-base-content/70"
                      >
                        <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                      <span className="px-2 py-0.5 sm:py-1 font-bold text-xs min-w-[20px] text-center">
                        {splitEveryN}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSplitEveryN((n) => Math.min(pages.length, n + 1))}
                        className="px-1.5 py-0.5 sm:px-2 sm:py-1 hover:bg-base-200 text-base-content/70"
                      >
                        <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                    </div>

                    <span className="text-[11px] sm:text-xs">{t('pages', 'pages')}</span>
                  </div>
                ) : (
                  <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer text-xs font-medium text-base-content/80 select-none">
                    <input
                      type="checkbox"
                      checked={separatePdfs}
                      onChange={(e) => setSeparatePdfs(e.target.checked)}
                      className="toggle toggle-xs toggle-primary"
                    />
                    <span className="text-[11px] sm:text-xs">{t('separatePdfs', 'Separate PDFs')}</span>
                  </label>
                )}
              </div>

              {/* Finish CTA Button */}
              <button
                type="button"
                onClick={handleProcess}
                disabled={processing || pages.length === 0 || (initialMode === 'extract' && selectedCount === 0)}
                className="btn btn-primary btn-sm px-3.5 sm:px-4 lg:px-5 font-bold shadow-md shadow-primary/20 rounded-xl gap-1.5 sm:gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-xs sm:text-sm shrink-0 h-auto min-h-[2rem] sm:min-h-[2.25rem] py-1.5 leading-snug flex items-center justify-center"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    <span>{t('processing', 'Processing...')}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {toolTab === 'split'
                        ? `${t('split', 'Split')} (${calculatedSplitCount} ${calculatedSplitCount > 1 ? t('separatePdfs', 'PDFs') : 'PDF'})`
                        : initialMode === 'extract' && selectedCount === 0
                        ? t('selectPagesToExtract', 'Select Pages to Extract')
                        : initialMode === 'delete'
                        ? `${t('delete', 'Delete')} (${selectedCount} ${selectedCount > 1 ? t('pages', 'Pages') : t('page', 'Page')})`
                        : `${t('finish', 'Finish')} (${selectedCount} ${selectedCount > 1 ? t('pages', 'Pages') : t('page', 'Page')})`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                <span>{t('selectAll', 'Select all')}</span>
              </label>
              <span className="text-[11px] text-base-content/40 hidden sm:inline">
                {initialMode === 'extract'
                  ? t('clickPagesToExtract', '• Click on pages you want to extract')
                  : t('dragToRearrange', '• Drag & drop any page to rearrange order')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSort}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-base-200 text-base-content/70 font-medium"
                title={t('reverseOrder', 'Reverse Order')}
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
                  title={t('listView', 'List View')}
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
                  title={t('gridView', 'Grid View')}
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
                          className="absolute -top-2.5 left-0 z-20 cursor-pointer p-0.5 rounded transition-transform hover:scale-110"
                        >
                          {page.selected ? (
                            <CheckSquare className="w-5 h-5 text-primary fill-base-100" />
                          ) : (
                            <Square className="w-5 h-5 text-base-content/40 fill-base-100" />
                          )}
                        </div>

                        {/* Fixed Bounding Preview Slot - Keeps uniform card size at all times */}
                        <div
                          onClick={() => toggleSelectPage(page.id)}
                          className="w-40 h-56 sm:w-48 sm:h-64 flex items-center justify-center relative cursor-pointer select-none"
                        >
                          {/* Inner Paper Sheet - Strictly maintains page aspect ratio without distortion */}
                          <div
                            style={{
                              aspectRatio: `${page.aspectRatio || 1 / 1.414}`,
                            }}
                            className={`relative max-w-full max-h-full bg-white rounded-none p-0 transition-all duration-200 flex items-center justify-center overflow-hidden ${
                              page.selected
                                ? 'ring-2 ring-primary shadow-lg shadow-primary/10'
                                : 'border border-base-300 shadow-sm hover:shadow-md hover:border-primary/50'
                            }`}
                          >
                            {/* Hover action pill overlay */}
                            <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-base-100/95 backdrop-blur-sm p-1 rounded-lg border border-base-300 shadow-md">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomPage(page);
                                }}
                                className="p-1 text-base-content/70 hover:text-primary rounded hover:bg-base-200"
                                title={t('zoomIn', 'Zoom page')}
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rotatePage(page.id, -90);
                                }}
                                className="p-1 text-base-content/70 hover:text-primary rounded hover:bg-base-200"
                                title={t('rotateLeft', 'Rotate Left')}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rotatePage(page.id, 90);
                                }}
                                className="p-1 text-base-content/70 hover:text-primary rounded hover:bg-base-200"
                                title={t('rotateRight', 'Rotate Right')}
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePage(page.id);
                                }}
                                className="p-1 text-error hover:bg-error/10 rounded"
                                title={t('delete', 'Delete')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Rendered Canvas Image - Fills paper cleanly without stretch or border distortion */}
                            {page.dataUrl ? (
                              <img
                                src={page.dataUrl}
                                alt={`Page ${page.pageNumber}`}
                                className="w-full h-full object-contain pointer-events-none select-none block"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 p-4 text-base-content/50 select-none bg-base-200/40">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                <span className="text-xs font-semibold text-base-content/70">{t('loading', 'Loading...')}</span>
                              </div>
                            )}
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
                                title={t('splitCutPoint', 'Click to toggle split cut point')}
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
                              title={t('insertBlankPage', 'Insert blank page here')}
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
                      <div className="w-12 h-16 bg-white border border-base-300 rounded-none overflow-hidden flex items-center justify-center p-0 shadow-xs">
                        {page.dataUrl ? (
                          <img
                            src={page.dataUrl}
                            alt={`Page ${page.pageNumber}`}
                            className="w-full h-full object-contain pointer-events-none select-none"
                          />
                        ) : (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-base-content">
                          {t('page', 'Page')} {page.pageNumber}
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
                        title={t('rotate', 'Rotate')}
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deletePage(page.id)}
                        className="btn btn-ghost btn-xs btn-circle text-error"
                        title={t('delete', 'Delete')}
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
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleAddDocumentPages(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Success Result View */}
      {resultData && (
        <ResultCard
          filename={resultData.filename}
          dataUrl={resultData.dataUrl}
          newSize={resultData.size}
          pageCount={resultData.pageCount}
          format={resultData.filename.endsWith('.zip') ? 'ZIP' : 'PDF'}
          title={
            initialMode === 'delete'
              ? t('pdfDeleteSuccess', 'Your updated PDF is ready for download!')
              : initialMode === 'extract'
              ? t('pdfExtractSuccess', 'Your extracted pages are ready for download!')
              : initialMode === 'rotate'
              ? t('pdfRotateSuccess', 'Your rotated PDF is ready for download!')
              : initialMode === 'split'
              ? t('pdfSplitSuccess', 'Your split PDF is ready for download!')
              : t('pdfReadyTitle', 'Your PDF is ready for download!')
          }
          subtitle={t('fileReadyDesc', 'Your file has been processed successfully. You can now download it or perform other actions below.')}
          resetLabel={t('processAnother', 'Process Another')}
          onReset={handleReset}
        />
      )}

      {/* Zoom Fullscreen Preview Modal */}
      {zoomPage && (
        <div
          onClick={() => setZoomPage(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full max-h-[92dvh] sm:max-h-[90vh] bg-base-100 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl flex flex-col items-center border border-base-300"
          >
            <button
              onClick={() => setZoomPage(null)}
              className="absolute top-4 right-4 btn btn-circle btn-sm btn-ghost"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="font-bold text-sm mb-3 text-base-content">
              {t('page', 'Page')} {zoomPage.pageNumber} {t('preview', 'Preview')}
            </h4>

            <div className="overflow-auto max-h-[75vh] rounded-xl flex items-center justify-center bg-base-200 p-3">
              <img
                src={zoomPage.dataUrl}
                alt={`Page ${zoomPage.pageNumber}`}
                className="max-h-full object-contain rounded-none shadow-md bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
