/**
 * lib/browser-converters/pdf-ocr.ts
 * 100% client-side Optical Character Recognition (OCR) engine.
 *
 * Capabilities:
 *  1. Turns flat scanned / image-based PDFs into searchable, selectable vector PDFs
 *     with an invisible text layer aligned to word coordinates.
 *  2. Converts scanned images (.png, .jpg) into searchable PDFs.
 *  3. Extracts clean, formatted, machine-readable plain text for copy-paste and editing.
 */

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

const workerUrl = (v: string) =>
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${v}/build/pdf.worker.min.mjs`;

async function loadPdfJs(): Promise<any> {
  const pdfjs: any = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl(pdfjs.version);
  }
  return pdfjs;
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

// Clean text for WinAnsi encoding supported by PDF Helvetica standard font
function sanitizeText(str: string): string {
  return str.replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, ' ').trim();
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

  // Create Tesseract worker with specified language
  const worker = await createWorker(language);

  report('Loading document...', 10);

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

      report('Recognizing characters with Optical Character Recognition...', 40);
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      const thumbnail = canvas.toDataURL('image/jpeg', 0.6);
      canvas.width = canvas.height = 0;
      URL.revokeObjectURL(objectUrl);

      const words = collectWords(data);
      const pageText = (data.text || '').trim();
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
        // Convert to clean JPEG bytes if needed
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
        const wY = pdfH - (w.bbox.y1 * scaleY);
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

      // Load for PDF.js page rendering (pass slice so worker doesn't detach)
      const pdf = await pdfjs.getDocument({ data: originalBytes.slice() }).promise;
      const numPages = pdf.numPages;

      // Load into pdf-lib to overlay searchable text directly onto existing pages
      outputDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
      const font = await outputDoc.embedFont(StandardFonts.Helvetica);

      for (let p = 1; p <= numPages; p++) {
        report(`Scanning & recognizing page ${p} of ${numPages}...`, 15 + Math.round((p / numPages) * 70));

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

        await page.render({ canvasContext: ctx, viewport: ocrVp, canvas }).promise;

        // Perform OCR on this page
        const { data } = await worker.recognize(canvas, {}, { blocks: true });
        const thumbnail = canvas.toDataURL('image/jpeg', 0.5);
        canvas.width = canvas.height = 0; // Release canvas memory

        const words = collectWords(data);
        const pageText = (data.text || '').trim();
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
        const pdfPage = outputDoc.getPage(p - 1);
        const pageH = origVp.height;

        for (const w of words) {
          if (!w.text || !w.bbox) continue;
          const cleanStr = sanitizeText(w.text);
          if (!cleanStr) continue;

          // Map OCR canvas coordinates back to 72 DPI PDF coordinates
          const wX = w.bbox.x0 / ocrScale;
          const wY = pageH - (w.bbox.y1 / ocrScale);
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

        page.cleanup();
      }

      await pdf.destroy?.();
    }

    report('Finalizing searchable document...', 92);

    const pdfBytes = await outputDoc.save({ useObjectStreams: true });
    const safeBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    ) as ArrayBuffer;

    const searchablePdfBlob = new Blob([safeBuffer], { type: 'application/pdf' });
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
