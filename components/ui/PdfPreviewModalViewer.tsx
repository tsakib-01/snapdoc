'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadPdfJs } from '@/lib/pdf/pdfThumbnailHelper';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Loader2, FileText, AlertCircle } from 'lucide-react';

interface PdfPreviewModalViewerProps {
  dataUrl: string;
  filename?: string;
}

export default function PdfPreviewModalViewer({ dataUrl, filename }: PdfPreviewModalViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [rendering, setRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);

  // Load PDF document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    async function initPdf() {
      try {
        const pdfjs = await loadPdfJs();
        if (!pdfjs) {
          throw new Error('PDF viewer engine could not be initialized.');
        }

        // Fetch the data as ArrayBuffer to support blob: and data: URLs reliably
        const response = await fetch(dataUrl);
        const arrayBuffer = await response.arrayBuffer();

        let doc: any;
        try {
          const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
          doc = await loadingTask.promise;
        } catch (workerErr) {
          console.warn('PDF.js worker initialization failed, retrying with disableWorker:', workerErr);
          if (pdfjs.GlobalWorkerOptions) {
            pdfjs.GlobalWorkerOptions.workerSrc = '';
          }
          const fallbackTask = pdfjs.getDocument({
            data: new Uint8Array(arrayBuffer),
            disableWorker: true,
          });
          doc = await fallbackTask.promise;
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
          setError(err.message || 'Could not load PDF document.');
          setLoading(false);
        }
      }
    }

    initPdf();

    return () => {
      isCancelled = true;
    };
  }, [dataUrl]);

  // Render current page to canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    setRendering(true);
    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const containerWidth = containerRef.current?.clientWidth || 360;
      // Calculate responsive base scale to fit container width nicely on mobile
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const fitScale = Math.min((containerWidth - 24) / unscaledViewport.width, 1.5);
      const effectiveScale = Math.max(0.4, fitScale * scale);

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
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    if (pdfDoc) {
      renderCurrentPage();
    }
  }, [pdfDoc, currentPage, scale, renderCurrentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleOpenExternal = () => {
    window.open(dataUrl, '_blank');
  };

  if (useIframeFallback) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-base-200 text-xs">
          <span className="text-base-content/60 font-medium">Standard browser viewer</span>
          <button
            onClick={() => setUseIframeFallback(false)}
            className="btn btn-ghost btn-xs text-primary font-bold"
          >
            Switch to interactive canvas viewer
          </button>
        </div>
        <iframe
          src={dataUrl}
          className="w-full flex-1 border-none rounded-xl"
          title={filename || 'PDF Preview'}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-between overflow-hidden">
      {/* Top Floating Control Bar */}
      <div className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-base-100 rounded-xl border border-base-200 shadow-xs mb-2 z-10 shrink-0">
        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading}
            className="btn btn-ghost btn-xs btn-circle disabled:opacity-30"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-base-content px-1 whitespace-nowrap">
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

        {/* Zoom Controls & Open External */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.5 || loading}
            className="btn btn-ghost btn-xs btn-circle disabled:opacity-30 hidden xs:inline-flex"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-base-content/70 px-1 hidden xs:inline-block">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 2.5 || loading}
            className="btn btn-ghost btn-xs btn-circle disabled:opacity-30 hidden xs:inline-flex"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleOpenExternal}
            className="btn btn-ghost btn-xs rounded-lg text-primary gap-1 font-semibold ml-1"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">New tab</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Viewport */}
      <div className="flex-1 w-full overflow-auto flex items-center justify-center p-1 sm:p-2 bg-base-200/60 rounded-xl relative">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-base-content/60">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-xs font-semibold">Rendering document preview...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-sm">
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

        {/* The rendered page canvas */}
        <canvas
          ref={canvasRef}
          className={`rounded-lg shadow-md transition-opacity duration-150 bg-white ${
            loading || error ? 'hidden' : rendering ? 'opacity-70' : 'opacity-100'
          }`}
        />
      </div>
    </div>
  );
}
