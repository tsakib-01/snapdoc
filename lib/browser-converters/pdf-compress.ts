/**
 * lib/browser-converters/pdf-compress.ts
 * 100% client-side crash-proof PDF compression engine.
 *
 * Strategies:
 *   1. Canvas-based high-DPI visual compression (renders pages to optimized JPEG + overlays invisible selectable text)
 *   2. Structural metadata stripping + object stream deflation (lossless vector preservation)
 *
 * Safety Guarantees:
 *   - NEVER returns 0 bytes.
 *   - NEVER returns an unparseable or corrupted PDF (verifies every output with PDFDocument.load).
 *   - NEVER returns a file with missing pages (verifies output pageCount === original pageCount).
 *   - If compression cannot safely reduce size, falls back cleanly to the verified original document.
 */

export interface BrowserConversionResult {
  blob: Blob;
  dataUrl: string; // URL.createObjectURL(blob)
  filename: string;
  size: number;
  originalSize?: number;
  reductionPercentage?: number;
  pageCount?: number;
}

export interface PdfCompressOptions {
  quality?: 'low' | 'medium' | 'high'; // default 'medium'
  onProgress?: (pct: number) => void;
}

const PRESETS = {
  low: { scale: 1.25, jpeg: 0.55 },     // ~75% compression target ('Maximum')
  medium: { scale: 1.50, jpeg: 0.70 },  // ~50% compression target ('Balanced')
  high: { scale: 1.80, jpeg: 0.85 },    // ~25% compression target ('Standard')
} as const;

function assertBrowser(): void {
  if (typeof window === 'undefined') {
    throw new Error('compressPdf must run in the browser.');
  }
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

const workerUrl = (v: string) =>
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${v}/build/pdf.worker.min.mjs`;

async function loadPdfJs(): Promise<any> {
  const pdfjs: any = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl(pdfjs.version);
  }
  return pdfjs;
}

/** Converts a Uint8Array into a safe, independent ArrayBuffer (no view offset issues, crash-proof against detached buffers) */
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  try {
    if (u8.buffer && u8.buffer.byteLength > 0) {
      return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
    }
  } catch {
    // Fallback if buffer is detached
  }
  const copy = new Uint8Array(u8.length);
  copy.set(u8);
  return copy.buffer as ArrayBuffer;
}

/* -------------------------------------------------------------------------- */
/* Method 1: Structural Stream Deflation & Metadata Stripping (Lossless)       */
/* -------------------------------------------------------------------------- */

async function structuralCompress(
  originalBytes: Uint8Array,
  expectedPages: number
): Promise<Uint8Array | null> {
  try {
    const { PDFDocument, PDFName } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(originalBytes, { updateMetadata: false });

    // Strip metadata
    try {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
      pdfDoc.catalog.delete(PDFName.of('Metadata'));
    } catch {
      // Non-fatal
    }

    const saved = await pdfDoc.save({ useObjectStreams: true });
    if (!saved || saved.length === 0 || saved.length >= originalBytes.length) {
      return null;
    }

    // Verify output validity
    const verify = await PDFDocument.load(saved, { updateMetadata: false });
    if (verify.getPageCount() !== expectedPages) {
      return null;
    }

    return saved;
  } catch (e) {
    console.warn('Structural compression failed:', e);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Method 2: High-DPI Canvas Compression with Searchable Text Overlay         */
/* -------------------------------------------------------------------------- */

async function rasterizeCompress(
  originalBytes: Uint8Array,
  quality: 'low' | 'medium' | 'high',
  expectedPages: number,
  onProgress?: (pct: number) => void
): Promise<Uint8Array | null> {
  try {
    const [pdfjs, { PDFDocument, StandardFonts, rgb }] = await Promise.all([
      loadPdfJs(),
      import('pdf-lib'),
    ]);

    // Pass a fresh slice so PDF.js worker doesn't detach originalBytes buffer
    const pdf = await pdfjs.getDocument({ data: originalBytes.slice() }).promise;
    const numPages = pdf.numPages;
    if (numPages === 0 || numPages !== expectedPages) {
      await pdf.destroy?.();
      return null;
    }

    const newDoc = await PDFDocument.create();
    let font: any = null;
    try {
      font = await newDoc.embedFont(StandardFonts.Helvetica);
    } catch {
      // Font embedding optional for invisible text overlay
    }

    const preset = PRESETS[quality] ?? PRESETS.medium;

    for (let p = 1; p <= numPages; p++) {
      const page = await pdf.getPage(p);
      const vp = page.getViewport({ scale: preset.scale });
      const origVp = page.getViewport({ scale: 1.0 });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(vp.width));
      canvas.height = Math.max(1, Math.ceil(vp.height));
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render page content
      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;

      // Extract text content for invisible searchable text overlay
      let textItems: any[] = [];
      try {
        const tc = await page.getTextContent();
        textItems = tc.items || [];
      } catch {
        // Optional
      }

      // Synchronous, crash-proof DataURL generation
      const dataUrl = canvas.toDataURL('image/jpeg', preset.jpeg);
      canvas.width = canvas.height = 0; // Release canvas memory immediately

      if (!dataUrl || dataUrl.length < 50) {
        page.cleanup();
        await pdf.destroy?.();
        return null;
      }

      const base64Data = dataUrl.split(',')[1] || dataUrl;
      const binaryString = atob(base64Data);
      const jpegBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        jpegBytes[i] = binaryString.charCodeAt(i);
      }

      const img = await newDoc.embedJpg(jpegBytes);
      const newPage = newDoc.addPage([origVp.width, origVp.height]);
      newPage.drawImage(img, {
        x: 0,
        y: 0,
        width: origVp.width,
        height: origVp.height,
      });

      // Overlay invisible selectable text
      if (font && textItems.length > 0) {
        for (const it of textItems) {
          if (!it.str || typeof it.str !== 'string' || !it.str.trim()) continue;
          try {
            const tx = it.transform[4];
            const ty = it.transform[5];
            const fs = it.height || Math.abs(it.transform[3]) || 10;
            const cleanStr = it.str.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
            if (cleanStr.trim()) {
              newPage.drawText(cleanStr, {
                x: tx,
                y: ty,
                size: Math.max(4, Math.min(72, fs)),
                font,
                color: rgb(0, 0, 0),
                opacity: 0,
              });
            }
          } catch {
            // Ignore single glyph draw errors
          }
        }
      }

      page.cleanup();
      onProgress?.(25 + Math.round((p / numPages) * 65));
      await tick();
    }

    await pdf.destroy?.();

    if (newDoc.getPageCount() !== numPages) {
      return null;
    }

    const saved = await newDoc.save({ useObjectStreams: true });
    if (!saved || saved.length === 0 || saved.length >= originalBytes.length) {
      return null;
    }

    // Verify output validity
    const verify = await PDFDocument.load(saved, { updateMetadata: false });
    if (verify.getPageCount() !== numPages) {
      return null;
    }

    return saved;
  } catch (e) {
    console.warn('Adaptive rasterize compression failed:', e);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Main compressPdf Entry Point                                               */
/* -------------------------------------------------------------------------- */

export async function compressPdf(
  file: File,
  options: PdfCompressOptions = {}
): Promise<BrowserConversionResult> {
  assertBrowser();
  const { quality = 'medium', onProgress } = options;
  const report = (p: number) => onProgress?.(Math.max(0, Math.min(100, Math.round(p))));
  report(5);

  const originalArrayBuffer = await file.arrayBuffer();
  const originalBytes = new Uint8Array(originalArrayBuffer);

  // Safety check: ensure input is not 0 bytes
  if (originalBytes.length === 0) {
    throw new Error('The uploaded PDF file is empty (0 bytes).');
  }

  // 1. Determine original page count & verify input PDF
  let pageCount = 1;
  try {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(originalBytes, { updateMetadata: false });
    pageCount = doc.getPageCount();
    if (pageCount === 0) pageCount = 1;
  } catch (e: any) {
    throw new Error(
      /encrypt/i.test(String(e?.message))
        ? 'This PDF is password-protected. Remove password before compressing.'
        : `Could not read PDF: ${e?.message || 'Invalid format'}`
    );
  }

  report(15);

  // 2. Try Method 1: Structural lossless optimization
  const pass1Bytes = await structuralCompress(originalBytes, pageCount);
  const pass1Size = pass1Bytes ? pass1Bytes.length : Infinity;
  const pass1Reduction = pass1Bytes ? ((1 - pass1Size / originalBytes.length) * 100) : 0;

  report(30);

  // 3. Try Method 2: High-DPI visual compression if Method 1 did not achieve strong reduction
  const targetThreshold = quality === 'low' ? 35 : quality === 'medium' ? 20 : 10;
  let pass2Bytes: Uint8Array | null = null;

  if (pass1Reduction < targetThreshold) {
    pass2Bytes = await rasterizeCompress(originalBytes, quality, pageCount, (p) => report(p));
  }

  report(95);

  // 4. Select the best verified output
  let finalBytes: Uint8Array = originalBytes;
  let finalSize = originalBytes.length;

  if (pass1Bytes && pass1Bytes.length > 500 && pass1Bytes.length < finalSize) {
    finalBytes = pass1Bytes;
    finalSize = pass1Bytes.length;
  }

  if (pass2Bytes && pass2Bytes.length > 500 && pass2Bytes.length < finalSize) {
    finalBytes = pass2Bytes;
    finalSize = pass2Bytes.length;
  }

  // Final safety verification: NEVER emit a 0-byte or corrupted file
  if (!finalBytes || finalBytes.length === 0) {
    finalBytes = originalBytes;
  }

  const safeBuffer = toArrayBuffer(finalBytes);
  const blob = new Blob([safeBuffer], { type: 'application/pdf' });
  const reduction = Math.max(0, (1 - blob.size / originalBytes.length) * 100);

  report(100);

  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    filename: `${file.name.replace(/\.pdf$/i, '') || 'document'}-compressed.pdf`,
    size: blob.size,
    originalSize: file.size,
    reductionPercentage: Math.round(reduction * 10) / 10,
    pageCount,
  };
}
