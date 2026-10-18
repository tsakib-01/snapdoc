'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadPdfJs } from '@/lib/pdf/pdfThumbnailHelper';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface PdfPreviewModalViewerProps {
  dataUrl: string;
  filename?: string;
}

export default function PdfPreviewModalViewer({ dataUrl, filename }: PdfPreviewModalViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  const [blobUrl, setBlobUrl] = useState<string>('');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  // Default to 'width' on mobile screens so text is immediately readable, and 'page' on desktop
  const [fitMode, setFitMode] = useState<'page' | 'width'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'width';
    }
    return 'page';
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [rendering, setRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);

  // Convert incoming dataUrl into an active blob URL
  useEffect(() => {
    let active = true;
    let localBlobUrl = '';

    async function initBlob() {
      if (!dataUrl) return;

      if (dataUrl.startsWith('blob:')) {
        if (active) setBlobUrl(dataUrl);
        return;
      }

      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
        localBlobUrl = URL.createObjectURL(pdfBlob);
        if (active) {
          setBlobUrl(localBlobUrl);
        }
      } catch (err) {
        console.warn('Could not create blob URL from dataUrl:', err);
        if (active) setBlobUrl(dataUrl);
      }
    }

    initBlob();

    return () => {
      active = false;
      if (localBlobUrl && localBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [dataUrl]);

  // Load PDF document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    async function initPdf() {
      try {
        let pdfjs: any = null;
        try {
          pdfjs = await import('pdfjs-dist');
          if (!pdfjs.GlobalWorkerOptions?.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
          }
        } catch {
          pdfjs = await loadPdfJs();
        }

        if (!pdfjs) {
          setUseIframeFallback(true);
          setLoading(false);
          return;
        }

        const response = await fetch(dataUrl);
        const arrayBuffer = await response.arrayBuffer();
        const originalBytes = new Uint8Array(arrayBuffer);

        let doc: any;
        try {
          const loadingTask = pdfjs.getDocument({
            data: originalBytes.slice(),
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
          });
          doc = await loadingTask.promise;
        } catch (workerErr) {
          console.warn('PDF.js worker initialization failed, retrying with fallback:', workerErr);
          try {
            const fallbackTask = pdfjs.getDocument({
              data: originalBytes.slice(),
              disableWorker: true,
              cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
              cMapPacked: true,
              standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
            });
            doc = await fallbackTask.promise;
          } catch (fallbackErr) {
            console.warn('PDF.js canvas fallback failed, activating browser iframe viewer:', fallbackErr);
            setUseIframeFallback(true);
            setLoading(false);
            return;
          }
        }

        if (!isCancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading PDF in viewer:', err);
        if (!isCancelled) {
          setUseIframeFallback(true);
          setLoading(false);
        }
      }
    }

    initPdf();

    return () => {
      isCancelled = true;
    };
  }, [dataUrl]);

  // Render current page to canvas with responsive sizing
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    setRendering(true);
    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewportEl = scrollViewportRef.current;
      const containerWidth = viewportEl?.clientWidth || containerRef.current?.clientWidth || 320;
      const containerHeight = viewportEl?.clientHeight || 450;

      // Available space inside scroll viewport (minus padding)
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      const padding = isMobile ? 16 : 32;
      const availableWidth = Math.max(containerWidth - padding, 150);
      const availableHeight = Math.max(containerHeight - padding, 150);

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const fitWidthScale = availableWidth / unscaledViewport.width;
      const fitHeightScale = availableHeight / unscaledViewport.height;

      // In 'page' mode: fit both width and height so the entire page is visible
      // In 'width' mode: fit container width so text is larger and easy to read
      let baseScale = fitMode === 'width' ? fitWidthScale : Math.min(fitWidthScale, fitHeightScale);
      baseScale = Math.min(baseScale, 1.8);

      const effectiveScale = Math.max(0.3, Math.min(baseScale * scale, 3.5));

      const viewport = page.getViewport({ scale: effectiveScale });
      const outputScale = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(outputScale, outputScale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;
        ctx.restore();
      }
    } catch (err: any) {
      console.warn('Canvas rendering error:', err);
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, currentPage, scale, fitMode]);

  useEffect(() => {
    if (pdfDoc) {
      renderCurrentPage();
    }
  }, [pdfDoc, currentPage, scale, fitMode, renderCurrentPage]);

  // Window resize listener
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (pdfDoc) {
          renderCurrentPage();
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [pdfDoc, renderCurrentPage]);

  // Touch pinch-to-zoom support for mobile screens
  useEffect(() => {
    const el = scrollViewportRef.current;
    if (!el) return;

    let initialDistance = 0;
    let initialScale = scale;

    const getDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches);
        initialScale = scale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const factor = currentDistance / initialDistance;
        const newScale = Math.max(0.5, Math.min(3.0, initialScale * factor));
        setScale(Number(newScale.toFixed(2)));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistance = 0;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scale]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = 0;
      }
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = 0;
      }
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.0);
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = 0;
    }
  };

  const toggleFitMode = () => {
    setFitMode((prev) => (prev === 'page' ? 'width' : 'page'));
    setScale(1.0);
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = 0;
    }
  };

  // Helper to reliably get an openable URL
  const getOpenableUrl = (): string => {
    if (blobUrl) return blobUrl;
    if (dataUrl && dataUrl.startsWith('data:')) {
      try {
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: mime });
        return URL.createObjectURL(blob);
      } catch {
        return dataUrl;
      }
    }
    return dataUrl;
  };

  const handleOpenExternal = () => {
    const targetUrl = getOpenableUrl();
    if (!targetUrl) return;

    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 100);
  };

  if (useIframeFallback) {
    return (
      <div className="w-full h-full flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-base-200 text-xs shrink-0">
          <span className="text-base-content/60 font-medium">Standard browser viewer</span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleOpenExternal}
              className="btn btn-ghost btn-xs text-primary font-bold gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>New tab</span>
            </button>
            <button
              type="button"
              onClick={() => setUseIframeFallback(false)}
              className="btn btn-ghost btn-xs text-primary font-bold"
            >
              Switch to interactive
            </button>
          </div>
        </div>
        <iframe
          src={blobUrl || dataUrl}
          className="w-full flex-1 min-h-0 border-none rounded-xl"
          title={filename || 'PDF Preview'}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-between overflow-hidden min-h-0">
      {/* Top Floating Control Bar - Fully responsive for mobile and desktop */}
      <div className="w-full flex items-center justify-between gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-base-100 rounded-xl border border-base-200 shadow-xs mb-1.5 sm:mb-2 z-10 shrink-0">
        {/* Page navigation */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading}
            className="btn btn-ghost btn-xs btn-circle disabled:opacity-30"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] sm:text-xs font-semibold text-base-content px-0.5 sm:px-1 whitespace-nowrap">
            {loading ? '...' : `${currentPage} / ${totalPages}`}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || loading}
            className="btn btn-ghost btn-xs btn-circle disabled:opacity-30"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & View Mode Controls - Clean, touch-friendly, never overflows */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Fit Page / Fit Width Toggle */}
          <button
            type="button"
            onClick={toggleFitMode}
            disabled={loading}
            className="btn btn-ghost btn-xs rounded-lg gap-1 font-semibold text-[11px] text-base-content/75 hover:text-base-content px-1.5 sm:px-2"
            title={fitMode === 'page' ? 'Switch to Fit Width' : 'Switch to Fit Entire Page'}
          >
            {fitMode === 'page' ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-base-content/70" />
                <span className="hidden sm:inline">Fit Page</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-base-content/70" />
                <span className="hidden sm:inline">Fit Width</span>
              </>
            )}
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.5 || loading}
            className="btn btn-ghost btn-xs btn-circle disabled:opacity-30"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom % Pill (Click to Reset) */}
          <button
            type="button"
            onClick={handleResetZoom}
            disabled={loading}
            className="btn btn-ghost btn-xs px-1 sm:px-1.5 font-mono text-[10px] sm:text-[11px] text-base-content/70 hover:text-base-content"
            title="Reset to 100%"
          >
            {Math.round(scale * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3.0 || loading}
            className="btn btn-ghost btn-xs btn-circle disabled:opacity-30"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Open in New Tab Button */}
          <button
            type="button"
            onClick={handleOpenExternal}
            className="btn btn-ghost btn-xs rounded-lg text-primary gap-1 font-semibold hover:bg-primary/10 px-1.5 sm:px-2"
            title="Open PDF in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">New tab</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Viewport */}
      <div
        ref={scrollViewportRef}
        className="flex-1 w-full min-h-0 overflow-auto p-2 sm:p-5 bg-base-200/60 rounded-xl relative flex flex-col items-center touch-pan-y overscroll-contain"
      >
        {loading && (
          <div className="my-auto flex flex-col items-center justify-center gap-2 p-8 text-base-content/60">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-xs font-semibold">Rendering document preview...</span>
          </div>
        )}

        {error && !loading && (
          <div className="my-auto flex flex-col items-center justify-center gap-3 p-6 text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-warning" />
            <div>
              <p className="text-xs font-bold text-base-content">Preview unavailable inline</p>
              <p className="text-[11px] text-base-content/60 mt-0.5">{error}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={handleOpenExternal}
                className="btn btn-xs btn-primary font-bold gap-1 rounded-lg"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Viewer</span>
              </button>
              <button
                type="button"
                onClick={() => setUseIframeFallback(true)}
                className="btn btn-xs btn-ghost border border-base-300 font-semibold rounded-lg"
              >
                Try Browser Frame
              </button>
            </div>
          </div>
        )}

        {/* The rendered page canvas wrapped with my-auto and shrink-0 to prevent negative scroll clipping */}
        <div className={`my-auto max-w-full flex flex-col items-center shrink-0 ${loading || error ? 'hidden' : ''}`}>
          <canvas
            ref={canvasRef}
            className={`rounded-none shadow-md border border-base-300/50 transition-opacity duration-150 bg-white block ${
              rendering ? 'opacity-70' : 'opacity-100'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
