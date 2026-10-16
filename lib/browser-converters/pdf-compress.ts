/**
 * lib/browser-converters/pdf-compress.ts
 * 100% client-side PDF compression using pdf-lib + Canvas:
 *   1. Downsample & re-encode embedded JPEG (DCTDecode) images via canvas.
 *   2. Strip metadata / XMP.
 *   3. Re-save with object streams (stream deflation of the PDF structure).
 * Text and vector content are NOT rasterized, so they stay sharp and selectable.
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
  low: { maxDim: 1000, jpeg: 0.5 },
  medium: { maxDim: 1600, jpeg: 0.7 },
  high: { maxDim: 2400, jpeg: 0.85 },
} as const;

const MIN_IMAGE_BYTES = 20 * 1024; // ignore tiny images, not worth re-encoding
const MIN_GAIN = 0.9; // only replace if new data is < 90% of the original

function assertBrowser(): void {
  if (typeof window === 'undefined') throw new Error('compressPdf must run in the browser.');
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function canvasToJpeg(canvas: HTMLCanvasElement, q: number): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      async (b) => resolve(b ? new Uint8Array(await b.arrayBuffer()) : null),
      'image/jpeg',
      q
    );
  });
}

export async function compressPdf(
  file: File,
  options: PdfCompressOptions = {}
): Promise<BrowserConversionResult> {
  assertBrowser();
  const { quality = 'medium', onProgress } = options;
  const preset = PRESETS[quality] ?? PRESETS.medium;
  const report = (p: number) => onProgress?.(Math.max(0, Math.min(100, Math.round(p))));
  report(2);

  const { PDFDocument, PDFName, PDFRawStream, PDFNumber, PDFArray, PDFBool } = await import('pdf-lib');
  const originalBytes = new Uint8Array(await file.arrayBuffer());

  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(originalBytes, { updateMetadata: false });
  } catch (e: any) {
    throw new Error(
      /encrypt/i.test(String(e?.message))
        ? 'This PDF is password-protected. Remove the password first.'
        : `Could not read PDF: ${e?.message ?? e}`
    );
  }
  const ctx = pdfDoc.context;
  report(8);

  // ---- helpers bound to the pdf-lib classes ----
  const filterName = (dict: any): string | null => {
    const f = dict.get(PDFName.of('Filter'));
    if (f instanceof PDFName) return f.toString();
    if (f instanceof PDFArray && f.size() === 1) {
      const e = f.lookup(0);
      return e instanceof PDFName ? e.toString() : null;
    }
    return null;
  };

  // JPEGs in CMYK (or with a /Decode array) would change colour when round-tripped via canvas.
  const isSafeColor = (dict: any): boolean => {
    if (dict.get(PDFName.of('Decode'))) return false;
    const cs = dict.lookup(PDFName.of('ColorSpace'));
    if (cs instanceof PDFName) return cs.toString() === '/DeviceRGB' || cs.toString() === '/DeviceGray';
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

  // ---- 1. Collect candidate JPEG images ----
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

  // ---- 2. Downsample + re-encode ----
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
        bmp = await createImageBitmap(jpegBlob, { imageOrientation: 'none' } as any); // PDF ignores EXIF
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
      // Keep transparency links (their own dimensions may differ - allowed by the PDF spec).
      for (const key of ['SMask', 'Mask']) {
        const v = d.get(PDFName.of(key));
        if (v) newDict.set(PDFName.of(key), v);
      }
      ctx.assign(ref, PDFRawStream.of(newDict, out));
    } catch (e) {
      console.warn('Skipped an image during compression:', e);
    }
    report(8 + ((i + 1) / candidates.length) * 82);
    await tick();
  }
  report(90);

  // ---- 3. Strip metadata ----
  try {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
    pdfDoc.catalog.delete(PDFName.of('Metadata'));
  } catch { /* non-fatal */ }

  // ---- 4. Save with object streams ----
  const saved = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
  const pageCount = pdfDoc.getPageCount();

  // Never hand back something bigger than the input.
  const useOriginal = saved.length >= originalBytes.length;
  const finalBytes = useOriginal ? originalBytes : saved;
  const blob = new Blob([finalBytes as any], { type: 'application/pdf' });
  const reduction = Math.max(0, (1 - blob.size / file.size) * 100);
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
