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

const PDF_JS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDF_JS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfJsLoadPromise: Promise<any> | null = null;

export async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return null;

  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }

  if (pdfJsLoadPromise) {
    return pdfJsLoadPromise;
  }

  pdfJsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDF_JS_CDN;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_CDN;
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js failed to load properly.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js script from CDN.'));
    document.head.appendChild(script);
  });

  return pdfJsLoadPromise;
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
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
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

    // Also extract text content if needed for search/OCR/summaries
    try {
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      extractedText.push(pageText);
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
