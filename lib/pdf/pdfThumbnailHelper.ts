// Client-side PDF.js thumbnail extraction utility

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export interface PdfPageThumbnail {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

const LOCAL_PDF_JS = '/vendor/pdfjs/pdf.min.js';
const LOCAL_PDF_WORKER = '/vendor/pdfjs/pdf.worker.min.js';
const PDF_JS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDF_JS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfJsLoadPromise: Promise<any> | null = null;

function setupPdfWorker(pdfjs: any) {
  try {
    if (typeof window !== 'undefined' && pdfjs && pdfjs.GlobalWorkerOptions) {
      // 1. Try local same-origin worker (guaranteed to work without CORS issues on mobile)
      pdfjs.GlobalWorkerOptions.workerSrc = LOCAL_PDF_WORKER;
    }
  } catch {
    try {
      // 2. Blob worker wrapper around CDN URL
      const workerBlob = new Blob([`importScripts("${PDF_JS_WORKER_CDN}");`], { type: 'application/javascript' });
      pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
    } catch {
      // 3. Direct CDN URL
      pdfjs.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_CDN;
    }
  }
}

export async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return null;

  if (window.pdfjsLib) {
    setupPdfWorker(window.pdfjsLib);
    return window.pdfjsLib;
  }

  if (pdfJsLoadPromise) {
    return pdfJsLoadPromise;
  }

  pdfJsLoadPromise = new Promise((resolve, reject) => {
    // Attempt local vendor script first (same origin, offline capable)
    const script = document.createElement('script');
    script.src = LOCAL_PDF_JS;
    script.onload = () => {
      if (window.pdfjsLib) {
        setupPdfWorker(window.pdfjsLib);
        resolve(window.pdfjsLib);
      } else {
        loadCdnFallback(resolve, reject);
      }
    };
    script.onerror = () => {
      // Fallback to CDN if local script fails
      loadCdnFallback(resolve, reject);
    };
    document.head.appendChild(script);
  });

  return pdfJsLoadPromise;
}

function loadCdnFallback(resolve: (val: any) => void, reject: (err: any) => void) {
  const cdnScript = document.createElement('script');
  cdnScript.src = PDF_JS_CDN;
  cdnScript.onload = () => {
    if (window.pdfjsLib) {
      setupPdfWorker(window.pdfjsLib);
      resolve(window.pdfjsLib);
    } else {
      reject(new Error('PDF.js failed to load properly.'));
    }
  };
  cdnScript.onerror = () => reject(new Error('Failed to load PDF.js script from CDN.'));
  document.head.appendChild(cdnScript);
}

/**
 * Extracts structured text from PDF.js items, strictly preserving reading order,
 * line positions, paragraph gaps, and horizontal column alignments.
 */
export function extractStructuredPageText(items: any[]): string {
  if (!items || items.length === 0) return '';

  const validItems = items.filter((it: any) => it && typeof it.str === 'string' && it.str.length > 0);
  if (validItems.length === 0) return '';

  // Sort by Y descending (top to bottom in PDF coordinates), then by X ascending (left to right)
  const sorted = [...validItems].sort((a, b) => {
    const yA = a.transform ? a.transform[5] : 0;
    const yB = b.transform ? b.transform[5] : 0;
    const yDiff = yB - yA;
    if (Math.abs(yDiff) > 4) {
      return yDiff; // Higher Y first
    }
    const xA = a.transform ? a.transform[4] : 0;
    const xB = b.transform ? b.transform[4] : 0;
    return xA - xB;
  });

  // Group text items into lines (within 4px vertical tolerance)
  const lines: { y: number; items: typeof validItems }[] = [];
  for (const item of sorted) {
    const y = item.transform ? item.transform[5] : 0;
    const matchingLine = lines.find((line) => Math.abs(line.y - y) <= 4);
    if (matchingLine) {
      matchingLine.items.push(item);
    } else {
      lines.push({ y, items: [item] });
    }
  }

  const lineStrings: string[] = [];
  let prevY: number | null = null;

  for (const line of lines) {
    // Sort items horizontally on this line
    line.items.sort((a, b) => (a.transform ? a.transform[4] : 0) - (b.transform ? b.transform[4] : 0));

    // Detect paragraph breaks between lines (gap > 18px)
    if (prevY !== null) {
      const verticalGap = prevY - line.y;
      if (verticalGap > 20) {
        lineStrings.push('');
      }
    }
    prevY = line.y;

    let lineStr = '';
    let lastEndX = -1;

    for (const item of line.items) {
      const x = item.transform ? item.transform[4] : 0;
      const str = item.str;

      if (lastEndX >= 0) {
        const gap = x - lastEndX;
        if (gap > 24) {
          // Column gap in tables
          lineStr += '\t';
        } else if (gap > 2 && !lineStr.endsWith(' ') && !str.startsWith(' ')) {
          lineStr += ' ';
        }
      }

      lineStr += str;
      const itemWidth = item.width || (str.length * 5.5);
      lastEndX = x + itemWidth;
    }

    if (lineStr.trim()) {
      lineStrings.push(lineStr.trimEnd());
    }
  }

  return lineStrings.join('\n');
}

/**
 * Extracts thumbnails for all pages in a PDF file with progress callback
 */
export async function extractPdfThumbnails(
  file: File | ArrayBuffer,
  options: {
    maxPages?: number;
    scale?: number;
    onProgress?: (loaded: number, total: number) => void;
  } = {}
): Promise<{
  thumbnails: PdfPageThumbnail[];
  pageCount: number;
  extractedText?: string[];
}> {
  const pdfjs = await loadPdfJs();
  const scale = options.scale || 0.6; // Crisp thumbnail scale

  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
  let pdfDoc: any;
  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
    });
    pdfDoc = await loadingTask.promise;
  } catch (workerErr) {
    console.warn('Standard PDF.js worker failed, falling back to inline worker mode:', workerErr);
    try {
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = '';
      }
      const fallbackTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        disableWorker: true,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
      });
      pdfDoc = await fallbackTask.promise;
    } catch (fallbackErr) {
      console.error('PDF.js loading failed:', fallbackErr);
      throw fallbackErr;
    }
  }

  const totalPages = pdfDoc.numPages;
  const maxPagesToRender = options.maxPages ? Math.min(totalPages, options.maxPages) : totalPages;

  const thumbnails: PdfPageThumbnail[] = [];
  const extractedText: string[] = [];

  for (let i = 1; i <= maxPagesToRender; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (ctx) {
      // Draw white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      thumbnails.push({
        pageNumber: i,
        dataUrl,
        width: viewport.width,
        height: viewport.height,
        aspectRatio: viewport.width / viewport.height,
      });
    }

    // Extract structured text preserving positions and layout
    try {
      const textContent = await page.getTextContent({ normalizeWhitespace: false });
      const structuredText = extractStructuredPageText(textContent.items);
      extractedText.push(structuredText);
    } catch {
      extractedText.push('');
    }

    if (options.onProgress) {
      options.onProgress(i, totalPages);
    }
  }

  return {
    thumbnails,
    pageCount: totalPages,
    extractedText,
  };
}

