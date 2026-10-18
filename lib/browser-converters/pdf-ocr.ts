/**
 * lib/browser-converters/pdf-ocr.ts
 * 100% client-side Optical Character Recognition (OCR) engine.
 *
 * Capabilities:
 *  1. Turns flat scanned / image-based PDFs into searchable, selectable vector PDFs
 *     with an invisible text layer aligned to word coordinates.
 *  2. Converts scanned images (.png, .jpg) into searchable PDFs.
 *  3. Extracts clean, formatted, machine-readable plain text for copy-paste and editing.
 *  4. Native multilingual support with full German (ä, ö, ü, ß), French, Spanish, Italian, Portuguese.
 */

import { loadPdfJs } from '@/lib/pdf/pdfThumbnailHelper';

export interface PageOcrData {
  pageNum: number;
  thumbnail: string;
  text: string;
  wordCount: number;
}

export interface PdfOcrResult {
  searchablePdfBlob: Blob;
  searchablePdfUrl: string;
  filename: string;
  fullText: string;
  pageCount: number;
  wordCount: number;
  charCount: number;
  pages: PageOcrData[];
}

export interface PdfOcrOptions {
  language?: string; // default 'eng'
  onProgress?: (progress: { stage: string; percent: number }) => void;
}

function assertBrowser(): void {
  if (typeof window === 'undefined') {
    throw new Error('PDF OCR must run in the browser.');
  }
}

function collectWords(data: any): any[] {
  if (Array.isArray(data?.words) && data.words.length) return data.words;
  const words: any[] = [];
  for (const b of data?.blocks ?? []) {
    for (const p of b.paragraphs ?? []) {
      for (const l of p.lines ?? []) {
        for (const w of l.words ?? []) {
          words.push(w);
        }
      }
    }
  }
  return words;
}

// Clean text for WinAnsi encoding supported by PDF Helvetica standard font,
// preserving German umlauts and mapping typographic punctuation to ASCII equivalents
function sanitizeText(str: string): string {
  return str
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u20AC/g, 'EUR')
    .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, ' ')
    .trim();
}

export async function processPdfOcr(
  file: File,
  options: PdfOcrOptions = {}
): Promise<PdfOcrResult> {
  assertBrowser();
  const { language = 'eng', onProgress } = options;
  const report = (stage: string, percent: number) =>
    onProgress?.({ stage, percent: Math.max(0, Math.min(100, Math.round(percent))) });

  report('Initializing OCR engine...', 5);

  const { createWorker } = await import('tesseract.js');
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfjs = await loadPdfJs();

  // Combine selected language with English to ensure both national characters
  // and numbers/Latin punctuation are recognized with maximum accuracy
  const ocrLang = language === 'eng' ? 'eng' : `${language}+eng`;

  report(`Loading ${language.toUpperCase()} OCR language models...`, 10);

  // Create Tesseract worker with specified language and live progress reporter
  let worker: any;
  try {
    worker = await createWorker(ocrLang, 1, {
      logger: (m: any) => {
        if (m.status === 'downloading tesseract core') {
          report('Downloading OCR core engine...', Math.round(m.progress * 8));
        } else if (m.status === 'loading tesseract core') {
          report('Loading OCR core...', 8);
        } else if (m.status === 'downloading traineddata') {
          report(`Downloading ${language.toUpperCase()} language model...`, 10 + Math.round((m.progress || 0) * 15));
        } else if (m.status === 'loading language traineddata') {
          report('Loading language model...', 25);
        } else if (m.status === 'initializing api') {
          report('Initializing OCR engine...', 28);
        } else if (m.status === 'recognizing text') {
          const pagePct = Math.round((m.progress || 0) * 100);
          report(`Recognizing text... ${pagePct}%`, Math.min(95, 30 + Math.round((m.progress || 0) * 60)));
        }
      },
    });
  } catch (workerErr) {
    console.warn(`Could not load combined language ${ocrLang}, trying single ${language}:`, workerErr);
    worker = await createWorker(language, 1, {
      logger: (m: any) => {
        if (m.status === 'downloading traineddata') {
          report(`Downloading ${language.toUpperCase()} language model...`, 10 + Math.round((m.progress || 0) * 15));
        } else if (m.status === 'recognizing text') {
          const pagePct = Math.round((m.progress || 0) * 100);
          report(`Recognizing text... ${pagePct}%`, Math.min(95, 30 + Math.round((m.progress || 0) * 60)));
        }
      },
    });
  }

  report('Loading document...', 15);

  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name);
  const pagesData: PageOcrData[] = [];
  const fullTextParts: string[] = [];
  let totalWords = 0;

  try {
    let outputDoc: any;

    if (isImage) {
      // -------------------------------------------------------------
      // Case A: User uploaded a scanned image (JPG/PNG) -> Searchable PDF
      // -------------------------------------------------------------
      report('Analyzing scanned image...', 20);

      const imgBuffer = await file.arrayBuffer();
      const imgBytes = new Uint8Array(imgBuffer);

      // Create an image element to get dimensions & canvas
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = objectUrl;
      });

      const width = img.naturalWidth || 800;
      const height = img.naturalHeight || 1100;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Generate pristine thumbnail for Scanned Page Preview before Tesseract processing
      const thumbScale = Math.min(1.0, 700 / Math.max(width, height));
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = Math.ceil(width * thumbScale);
      thumbCanvas.height = Math.ceil(height * thumbScale);
      const thumbCtx = thumbCanvas.getContext('2d')!;
      thumbCtx.fillStyle = '#ffffff';
      thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
      thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.85);
      thumbCanvas.width = thumbCanvas.height = 0;

      report('Recognizing characters...', 40);
      let pageText = '';
      let words: any[] = [];
      try {
        const { data } = await worker.recognize(canvas, {}, { blocks: true });
        words = collectWords(data);
        pageText = (data.text || '').trim();
      } catch (recErr) {
        console.warn('OCR recognize error on image:', recErr);
      }

      canvas.width = canvas.height = 0;
      URL.revokeObjectURL(objectUrl);

      const wordCount = pageText ? pageText.split(/\s+/).filter(Boolean).length : 0;
      totalWords += wordCount;

      pagesData.push({
        pageNum: 1,
        thumbnail,
        text: pageText,
        wordCount,
      });
      fullTextParts.push(pageText);

      report('Building Searchable PDF layer...', 75);

      outputDoc = await PDFDocument.create();
      const font = await outputDoc.embedFont(StandardFonts.Helvetica);

      // Embed image
      let embeddedImg;
      if (file.type === 'image/png' || /\.png$/i.test(file.name)) {
        embeddedImg = await outputDoc.embedPng(imgBytes);
      } else {
        const b64 = thumbnail.split(',')[1] || thumbnail;
        const bin = atob(b64);
        const jBytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) jBytes[i] = bin.charCodeAt(i);
        embeddedImg = await outputDoc.embedJpg(jBytes);
      }

      // 72 DPI PDF points
      const pdfW = (width / 96) * 72;
      const pdfH = (height / 96) * 72;
      const scaleX = pdfW / width;
      const scaleY = pdfH / height;

      const pdfPage = outputDoc.addPage([pdfW, pdfH]);
      pdfPage.drawImage(embeddedImg, { x: 0, y: 0, width: pdfW, height: pdfH });

      // Overlay invisible selectable text at word coordinates
      for (const w of words) {
        if (!w.text || !w.bbox) continue;
        const cleanStr = sanitizeText(w.text);
        if (!cleanStr) continue;

        const wX = w.bbox.x0 * scaleX;
        const wY = pdfH - w.bbox.y1 * scaleY;
        const wH = Math.max(5, Math.min(72, (w.bbox.y1 - w.bbox.y0) * scaleY));

        try {
          pdfPage.drawText(cleanStr, {
            x: Math.max(0, wX),
            y: Math.max(0, wY),
            size: wH,
            font,
            color: rgb(0, 0, 0),
            opacity: 0,
          });
        } catch {
          // Ignore individual glyph render issues
        }
      }
    } else {
      // -------------------------------------------------------------
      // Case B: User uploaded a PDF document (scanned or image-based)
      // -------------------------------------------------------------
      const arrayBuffer = await file.arrayBuffer();
      const originalBytes = new Uint8Array(arrayBuffer);

      // Load for PDF.js page rendering with automatic inline fallback
      let pdf: any;
      try {
        const loadingTask = pdfjs.getDocument({
          data: originalBytes.slice(),
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
        });
        pdf = await loadingTask.promise;
      } catch (workerErr) {
        console.warn('Standard PDF.js worker failed, falling back to inline mode:', workerErr);
        const fallbackTask = pdfjs.getDocument({
          data: originalBytes.slice(),
          disableWorker: true,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
        });
        pdf = await fallbackTask.promise;
      }

      const numPages = pdf.numPages;

      // Load into pdf-lib to overlay searchable text directly onto existing pages
      // Fallback gracefully to creating a fresh searchable document if original encryption/xref forbids loading
      let isOverlayMode = true;
      try {
        outputDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
      } catch (pdfLibErr) {
        console.warn('PDFDocument.load failed, creating fresh searchable PDF:', pdfLibErr);
        outputDoc = await PDFDocument.create();
        isOverlayMode = false;
      }
      const font = await outputDoc.embedFont(StandardFonts.Helvetica);

      for (let p = 1; p <= numPages; p++) {
        report(`Scanning & recognizing page ${p} of ${numPages}...`, 20 + Math.round((p / numPages) * 70));

        const page = await pdf.getPage(p);
        const origVp = page.getViewport({ scale: 1.0 });

        // High resolution 2.0x scale (150-200 DPI) for maximum OCR accuracy
        const ocrScale = 2.0;
        const ocrVp = page.getViewport({ scale: ocrScale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(ocrVp.width);
        canvas.height = Math.ceil(ocrVp.height);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport: ocrVp,
        }).promise;

        // Capture crisp, reliable thumbnail for Scanned Page Preview immediately
        let thumbnail = '';
        try {
          const thumbScale = Math.min(1.0, 700 / Math.max(origVp.width, origVp.height));
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = Math.ceil(origVp.width * thumbScale);
          thumbCanvas.height = Math.ceil(origVp.height * thumbScale);
          const thumbCtx = thumbCanvas.getContext('2d')!;
          thumbCtx.fillStyle = '#ffffff';
          thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
          thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
          thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.85);
          thumbCanvas.width = thumbCanvas.height = 0;
        } catch {
          thumbnail = canvas.toDataURL('image/jpeg', 0.6);
        }

        // Perform OCR on this page
        let pageText = '';
        let words: any[] = [];
        try {
          const { data } = await worker.recognize(canvas, {}, { blocks: true });
          words = collectWords(data);
          pageText = (data.text || '').trim();
        } catch (ocrErr) {
          console.warn(`OCR recognize failed on page ${p}:`, ocrErr);
        }

        canvas.width = canvas.height = 0; // Release OCR canvas memory

        const wordCount = pageText ? pageText.split(/\s+/).filter(Boolean).length : 0;
        totalWords += wordCount;

        pagesData.push({
          pageNum: p,
          thumbnail,
          text: pageText,
          wordCount,
        });
        fullTextParts.push(`--- Page ${p} ---\n\n${pageText}`);

        // Overlay searchable text into pdf-lib page
        let pdfPage: any;
        if (isOverlayMode) {
          pdfPage = outputDoc.getPage(p - 1);
        } else {
          pdfPage = outputDoc.addPage([origVp.width, origVp.height]);
          try {
            const b64 = thumbnail.split(',')[1] || thumbnail;
            const bin = atob(b64);
            const jBytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) jBytes[i] = bin.charCodeAt(i);
            const embeddedImg = await outputDoc.embedJpg(jBytes);
            pdfPage.drawImage(embeddedImg, { x: 0, y: 0, width: origVp.width, height: origVp.height });
          } catch {}
        }

        const pageH = origVp.height;

        for (const w of words) {
          if (!w.text || !w.bbox) continue;
          const cleanStr = sanitizeText(w.text);
          if (!cleanStr) continue;

          // Map OCR canvas coordinates back to 72 DPI PDF coordinates
          const wX = w.bbox.x0 / ocrScale;
          const wY = pageH - w.bbox.y1 / ocrScale;
          const wH = Math.max(5, Math.min(72, (w.bbox.y1 - w.bbox.y0) / ocrScale));

          try {
            pdfPage.drawText(cleanStr, {
              x: Math.max(0, wX),
              y: Math.max(0, wY),
              size: wH,
              font,
              color: rgb(0, 0, 0),
              opacity: 0,
            });
          } catch {
            // Ignore glyph render errors
          }
        }

        page.cleanup?.();
      }

      await pdf.destroy?.();
    }

    report('Finalizing searchable document...', 92);

    const pdfBytes = await outputDoc.save({ useObjectStreams: true });
    const searchablePdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const searchablePdfUrl = URL.createObjectURL(searchablePdfBlob);

    const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'document';
    const fullText = fullTextParts.join('\n\n').trim();
    const charCount = fullText.length;

    report('Complete!', 100);

    return {
      searchablePdfBlob,
      searchablePdfUrl,
      filename: `${baseName}_searchable.pdf`,
      fullText,
      pageCount: pagesData.length,
      wordCount: totalWords,
      charCount,
      pages: pagesData,
    };
  } finally {
    // Terminate worker safely
    await worker.terminate().catch(() => {});
  }
}
