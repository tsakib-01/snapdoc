'use client';

import React, { useState } from 'react';
import { Loader2, Download, Image as ImageIcon, Archive, Sparkles, AlertCircle } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import JSZip from 'jszip';
import { formatBytes } from '@/lib/utils/formatters';

interface ExtractedPage {
  pageNumber: number;
  dataUrl: string;
  size: number;
}

// Dynamically load PDF.js from official CDN for zero webpack build issues and instant high-speed client execution
function loadPdfJsScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjs);
      } else {
        reject(new Error('PDF.js failed to initialize.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js library.'));
    document.head.appendChild(script);
  });
}

interface PdfToJpgToolProps {
  outputFormat?: 'jpg' | 'png';
}

export default function PdfToJpgTool({ outputFormat = 'jpg' }: PdfToJpgToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<boolean>(false);

  const isPng = outputFormat === 'png';
  const ext = isPng ? 'png' : 'jpg';
  const mime = isPng ? 'image/png' : 'image/jpeg';
  const label = isPng ? 'PNG' : 'JPG';

  const handleConvert = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsRendering(true);
    setPages([]);

    try {
      const pdfjs = await loadPdfJsScript();
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;

      const renderedPages: ExtractedPage[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.5 }); // Crisp 2.5x retina rendering

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          // Fill crisp white background
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          const dataUrl = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.95);
          const byteLength = Math.round((dataUrl.length * 3) / 4);

          renderedPages.push({
            pageNumber: pageNum,
            dataUrl,
            size: byteLength,
          });
        }
      }

      setPages(renderedPages);
    } catch (err: any) {
      console.error('PDF to Image conversion error:', err);
      setError('Failed to extract pages from PDF. Please make sure the PDF is valid and not password-protected.');
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownloadSingle = (page: ExtractedPage) => {
    const link = document.createElement('a');
    link.href = page.dataUrl;
    link.download = `${files[0].name.replace(/\.[^/.]+$/, '')}_page_${page.pageNumber}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllZip = async () => {
    if (pages.length === 0) return;
    setZipProgress(true);

    try {
      const zip = new JSZip();
      const baseName = files[0].name.replace(/\.[^/.]+$/, '');

      pages.forEach((p) => {
        const base64Data = p.dataUrl.split(',')[1];
        zip.file(`${baseName}_page_${p.pageNumber}.${ext}`, base64Data, { base64: true });
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}_${ext}_pages.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setZipProgress(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setPages([]);
    setError(null);
  };

  return (
    <div className="w-full space-y-6">
      {files.length === 0 && (
        <UploadZone
          accept="application/pdf"
          files={files}
          onFilesSelected={setFiles}
          title="Drop PDF file to extract JPG pages"
          subtitle="Converts every page to high-definition JPEG images"
        />
      )}

      {files.length > 0 && pages.length === 0 && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300">
            <div>
              <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs sm:max-w-md">
                {files[0].name}
              </p>
              <p className="text-xs text-base-content/60">
                File Size: <strong>{formatBytes(files[0].size)}</strong>
              </p>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-xs text-base-content/60 hover:text-error">
              Change
            </button>
          </div>

          {error && (
            <div className="alert alert-error text-xs rounded-2xl py-3 shadow-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleConvert}
            disabled={isRendering}
            className="btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/20 gap-2"
          >
            {isRendering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Extracting & Rendering High-DPI Pages...
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5" />
                Convert PDF to {label}
              </>
            )}
          </button>
        </div>
      )}

      {/* Rendered pages gallery */}
      {pages.length > 0 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-base-200/60 border border-base-300">
            <div>
              <h4 className="font-bold text-base text-base-content">
                Successfully Extracted {pages.length} Page{pages.length === 1 ? '' : 's'}
              </h4>
              <p className="text-xs text-base-content/60">
                Download individual {label} images or download all in a single ZIP archive.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadAllZip}
                disabled={zipProgress}
                className="btn btn-primary btn-sm rounded-xl gap-1.5 flex-1 sm:flex-initial text-white font-semibold shadow-md shadow-primary/20"
              >
                {zipProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                Download All as ZIP
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-ghost btn-sm rounded-xl border border-base-300"
              >
                New PDF
              </button>
            </div>
          </div>

          {/* Grid of Pages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pages.map((p) => (
              <div
                key={p.pageNumber}
                className="flex flex-col rounded-2xl border border-base-300 bg-base-100 overflow-hidden shadow-sm group hover:shadow-md transition-shadow"
              >
                <div className="p-2.5 bg-base-200/50 border-b border-base-300 flex items-center justify-between text-xs font-semibold">
                  <span className="text-base-content/70">Page {p.pageNumber}</span>
                  <span className="badge badge-sm badge-neutral">{formatBytes(p.size)}</span>
                </div>

                <div className="p-3 flex items-center justify-center bg-base-200/20 min-h-[220px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.dataUrl}
                    alt={`Page ${p.pageNumber}`}
                    className="max-h-[240px] max-w-full object-contain rounded border border-base-300 shadow-sm"
                  />
                </div>

                <div className="p-3 bg-base-100 border-t border-base-200">
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(p)}
                    className="btn btn-outline btn-primary btn-xs w-full rounded-xl gap-1.5 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download {label}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
