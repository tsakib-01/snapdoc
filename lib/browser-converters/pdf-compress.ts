/**
 * lib/browser-converters/pdf-compress.ts
 * 100% client-side PDF compression engine:
 *
 * Multi-Stage Compression Pipeline:
 *   Stage 1 (Structural / Lossless Optimization):
 *     - Strips redundant metadata, catalog tags, and document info.
 *     - Downsamples & re-encodes embedded DCTDecode image streams.
 *     - Deflates object streams using PDF 1.5 object stream compression.
 *     - If Stage 1 achieves significant size reduction (>= target threshold),
 *       it returns immediately to preserve 100% vector sharpness and text.
 *
 *   Stage 2 (Adaptive Visual Compression Fallback):
 *     - Used when Stage 1 yields little or no reduction (e.g. PDFs with FlateDecode,
 *       lossless raster images, scanned documents, Canva/Word exports, or complex vectors).
 *     - High-DPI canvas rendering with tuned JPEG encoding per quality preset.
 *     - Rebuilds the PDF and overlays an invisible text layer so text remains
 *       fully selectable and searchable.
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
  low: { maxDim: 1200, jpeg: 0.50, scale: 1.25 },     // ~75% compression target
  medium: { maxDim: 1600, jpeg: 0.68, scale: 1.50 },  // ~50% compression target
  high: { maxDim: 2200, jpeg: 0.82, scale: 1.80 },    // ~25% compression target
} as const;

const MIN_IMAGE_BYTES = 4 * 1024; // process any image >= 4KB
const MIN_GAIN = 0.98; // keep re-encoded image if it yields any gain

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

function canvasToJpeg(canvas: HTMLCanvasElement, q: number): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      async (b) => resolve(b ? new Uint8Array(await b.arrayBuffer()) : null),
      'image/jpeg',
      q
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Stage 1: Structural & Embedded Image Optimization                          */
/* -------------------------------------------------------------------------- */

async function structuralCompress(
  originalBytes: Uint8Array,
  quality: 'low' | 'medium' | 'high',
  onProgress?: (pct: number) => void
): Promise<Uint8Array | null> {
  const preset = PRESETS[quality] ?? PRESETS.medium;
  const { PDFDocument, PDFName, PDFRawStream, PDFNumber, PDFArray, PDFBool } =
    await import('pdf-lib');

  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(originalBytes, { updateMetadata: false });
  } catch {
    return null;
  }
  const ctx = pdfDoc.context;

  const filterName = (dict: any): string | null => {
    const f = dict.get(PDFName.of('Filter'));
    if (f instanceof PDFName) return f.toString();
    if (f instanceof PDFArray && f.size() === 1) {
      const e = f.lookup(0);
      return e instanceof PDFName ? e.toString() : null;
    }
    return null;
  };

  const isSafeColor = (dict: any): boolean => {
    if (dict.get(PDFName.of('Decode'))) return false;
    const cs = dict.lookup(PDFName.of('ColorSpace'));
    if (cs instanceof PDFName) {
      return cs.toString() === '/DeviceRGB' || cs.toString() === '/DeviceGray';
    }
    if (cs instanceof PDFArray) {
      const first = cs.lookup(0);
      if (first instanceof PDFName && first.toString() === '/ICCBased') {
        const prof: any = cs.lookup(1);
        const n = prof?.dict?.lookup?.(PDFName.of('N'));
        return n instanceof PDFNumber && (n.asNumber() === 3 || n.asNumber() === 1);
      }
    }
    return false;
  };

  // 1. Collect candidate JPEG images
  const candidates: { ref: any; stream: any }[] = [];
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const d = obj.dict;
    if (d.get(PDFName.of('Subtype'))?.toString() !== '/Image') continue;
    if (filterName(d) !== '/DCTDecode') continue;
    const mask = d.lookup(PDFName.of('ImageMask'));
    if (mask instanceof PDFBool && mask.asBoolean()) continue;
    if (obj.contents.length < MIN_IMAGE_BYTES) continue;
    if (!isSafeColor(d)) continue;
    candidates.push({ ref, stream: obj });
  }

  // 2. Downsample and re-encode candidate images
  for (let i = 0; i < candidates.length; i++) {
    const { ref, stream } = candidates[i];
    try {
      const d = stream.dict;
      const w = (d.lookup(PDFName.of('Width')) as any)?.asNumber?.() as number | undefined;
      const h = (d.lookup(PDFName.of('Height')) as any)?.asNumber?.() as number | undefined;
      if (!w || !h) continue;

      const jpegBlob = new Blob([stream.contents], { type: 'image/jpeg' });
      let bmp: ImageBitmap;
      try {
        bmp = await createImageBitmap(jpegBlob, { imageOrientation: 'none' } as any);
      } catch {
        bmp = await createImageBitmap(jpegBlob);
      }

      const scale = Math.min(1, preset.maxDim / Math.max(w, h));
      const nw = Math.max(1, Math.round(w * scale));
      const nh = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = nw;
      canvas.height = nh;
      const c2d = canvas.getContext('2d')!;
      c2d.fillStyle = '#fff';
      c2d.fillRect(0, 0, nw, nh);
      c2d.imageSmoothingQuality = 'high';
      c2d.drawImage(bmp, 0, 0, nw, nh);
      bmp.close?.();

      const out = await canvasToJpeg(canvas, preset.jpeg);
      canvas.width = canvas.height = 0;
      if (!out || out.length >= stream.contents.length * MIN_GAIN) continue;

      const newDict = ctx.obj({
        Type: 'XObject',
        Subtype: 'Image',
        Width: nw,
        Height: nh,
        ColorSpace: 'DeviceRGB',
        BitsPerComponent: 8,
        Filter: 'DCTDecode',
        Length: out.length,
      });

      for (const key of ['SMask', 'Mask']) {
        const v = d.get(PDFName.of(key));
        if (v) newDict.set(PDFName.of(key), v);
      }
      ctx.assign(ref, PDFRawStream.of(newDict, out));
    } catch {
      // Continue to next image
    }
    onProgress?.(10 + Math.round(((i + 1) / Math.max(1, candidates.length)) * 20));
    await tick();
  }

  // 3. Strip metadata
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

  // 4. Save with object streams
  try {
    const saved = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
    return saved;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Stage 2: Adaptive Visual Canvas Compression (with Selectable Text Overlay) */
/* -------------------------------------------------------------------------- */

async function rasterizeCompress(
  fileBytes: Uint8Array,
  quality: 'low' | 'medium' | 'high',
  onProgress?: (pct: number) => void
): Promise<Uint8Array | null> {
  try {
    const [pdfjs, { PDFDocument, StandardFonts, rgb }] = await Promise.all([
      loadPdfJs(),
      import('pdf-lib'),
    ]);

    const pdf = await pdfjs.getDocument({ data: fileBytes }).promise;
    const numPages = pdf.numPages;
    if (numPages === 0) return null;

    const newDoc = await PDFDocument.create();
    let font: any = null;
    try {
      font = await newDoc.embedFont(StandardFonts.Helvetica);
    } catch {
      // Font embedding optional for text overlay
    }

    const preset = PRESETS[quality] ?? PRESETS.medium;

    for (let p = 1; p <= numPages; p++) {
      const page = await pdf.getPage(p);
      const vp = page.getViewport({ scale: preset.scale });
      const origVp = page.getViewport({ scale: 1 });

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(vp.width);
      canvas.height = Math.ceil(vp.height);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;

      // Extract text content for selectable text overlay
      let textItems: any[] = [];
      try {
        const tc = await page.getTextContent();
        textItems = tc.items || [];
      } catch {
        // Optional
      }

      const jpegBytes = await canvasToJpeg(canvas, preset.jpeg);
      canvas.width = canvas.height = 0; // Release memory

      if (!jpegBytes) {
        page.cleanup();
        continue;
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
            // Ignore individual text character draw failure
          }
        }
      }

      page.cleanup();
      onProgress?.(35 + Math.round((p / numPages) * 55));
      await tick();
    }

    await pdf.destroy?.();
    const saved = await newDoc.save({ useObjectStreams: true, addDefaultPage: false });
    return saved;
  } catch (e) {
    console.warn('Adaptive rasterize compression skipped:', e);
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

  const originalBytes = new Uint8Array(await file.arrayBuffer());

  // 1. Run Stage 1: In-place structural compression
  report(10);
  let pass1Bytes: Uint8Array | null = null;
  try {
    pass1Bytes = await structuralCompress(originalBytes, quality, (p) => report(p));
  } catch (e) {
    console.warn('Stage 1 structural compression failed:', e);
  }

  const pass1Size = pass1Bytes ? pass1Bytes.length : originalBytes.length;
  const pass1Reduction = ((1 - pass1Size / originalBytes.length) * 100);

  // Target threshold determining whether Stage 2 fallback is needed:
  // If Stage 1 achieved a strong reduction, we keep it to maintain 100% vector fidelity.
  const targetThreshold = quality === 'low' ? 35 : quality === 'medium' ? 20 : 12;

  let pass2Bytes: Uint8Array | null = null;
  if (pass1Reduction < targetThreshold) {
    report(35);
    pass2Bytes = await rasterizeCompress(originalBytes, quality, (p) => report(p));
  }

  // Select the smallest valid result
  let bestBytes: any = originalBytes;
  let bestSize = originalBytes.length;

  if (pass1Bytes && pass1Bytes.length < bestSize) {
    bestBytes = pass1Bytes;
    bestSize = pass1Bytes.length;
  }

  if (pass2Bytes && pass2Bytes.length < bestSize) {
    bestBytes = pass2Bytes;
    bestSize = pass2Bytes.length;
  }

  report(95);

  // Determine page count
  let pageCount = 1;
  try {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(bestBytes, { updateMetadata: false });
    pageCount = doc.getPageCount();
  } catch {
    // Non-fatal fallback
  }

  const blob = new Blob([bestBytes as any], { type: 'application/pdf' });
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
