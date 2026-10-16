/**
 * lib/browser-converters/pdf-to-excel.ts
 * 100% client-side: PDF -> multi-sheet .xlsx using spatial clustering of text
 * coordinates (pdf.js). Pages with no text layer can fall back to Tesseract OCR.
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

export interface PdfToExcelOptions {
  ocrFallback?: boolean; // OCR pages that have no text layer (default: false)
  onProgress?: (pct: number) => void;
}

// Worker is derived from the INSTALLED pdfjs version so API/worker never mismatch.
// If your network blocks jsDelivr, swap for:
// `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.mjs`
const workerUrl = (v: string) => `https://cdn.jsdelivr.net/npm/pdfjs-dist@${v}/build/pdf.worker.min.mjs`;

/** Unified text fragment. y is the BASELINE measured top-down, in PDF points. */
interface Frag { str: string; x: number; y: number; w: number; h: number }
interface Cell { x: number; end: number; text: string }

function assertBrowser(): void {
  if (typeof window === 'undefined') throw new Error('convertPdfToExcel must run in the browser.');
}

async function loadPdfJs(): Promise<any> {
  const pdfjs: any = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl(pdfjs.version);
  }
  return pdfjs;
}

// ---------- Spatial clustering ----------

function clusterRows(frags: Frag[]): Frag[][] {
  const hs = frags.map((f) => f.h).sort((a, b) => a - b);
  const med = hs[Math.floor(hs.length / 2)] || 10;
  const tol = Math.max(2, med * 0.5);
  const sorted = [...frags].sort((a, b) => a.y - b.y);
  const rows: Frag[][] = [];
  let cur: Frag[] = [];
  let sum = 0;
  for (const f of sorted) {
    if (cur.length && Math.abs(f.y - sum / cur.length) > tol) {
      rows.push(cur);
      cur = [];
      sum = 0;
    }
    cur.push(f);
    sum += f.y;
  }
  if (cur.length) rows.push(cur);
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}

function rowToCells(row: Frag[]): Cell[] {
  const cells: Cell[] = [];
  for (const f of row) {
    const last = cells[cells.length - 1];
    if (last) {
      const gap = f.x - last.end;
      if (gap <= f.h * 1.0) {
        last.text += (gap > f.h * 0.15 ? ' ' : '') + f.str;
        last.end = f.x + f.w;
        continue;
      }
    }
    cells.push({ x: f.x, end: f.x + f.w, text: f.str });
  }
  for (const c of cells) c.text = c.text.replace(/\s+/g, ' ').trim();
  return cells.filter((c) => c.text);
}

function buildAnchors(xs: number[], tol = 8): number[] {
  const sorted = [...xs].sort((a, b) => a - b);
  const anchors: number[] = [];
  let group: number[] = [];
  for (const x of sorted) {
    if (group.length && x - group[group.length - 1] > tol) {
      anchors.push(group.reduce((s, v) => s + v, 0) / group.length);
      group = [];
    }
    group.push(x);
  }
  if (group.length) anchors.push(group.reduce((s, v) => s + v, 0) / group.length);
  return anchors;
}

function coerce(s: string): string | number {
  const t = s.trim();
  if (/^-?\d+(\.\d+)?$/.test(t) && !(t.length > 1 && t.startsWith('0') && !t.includes('.'))) return Number(t);
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return Number(t.replace(/,/g, ''));
  return s;
}

function fragsToGrid(frags: Frag[]): (string | number)[][] {
  if (!frags.length) return [];
  const rows = clusterRows(frags).map(rowToCells).filter((r) => r.length);
  const anchors = buildAnchors(rows.flatMap((r) => r.map((c) => c.x)));
  return rows.map((cells) => {
    const out: string[] = new Array(anchors.length).fill('');
    for (const c of cells) {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < anchors.length; i++) {
        const d = Math.abs(anchors[i] - c.x);
        if (d < bestD) { bestD = d; best = i; }
      }
      out[best] = out[best] ? `${out[best]} ${c.text}` : c.text;
    }
    return out.map(coerce);
  });
}

// ---------- OCR helpers ----------

function collectWords(data: any): any[] {
  if (Array.isArray(data?.words) && data.words.length) return data.words;
  const words: any[] = [];
  for (const b of data?.blocks ?? [])
    for (const p of b.paragraphs ?? [])
      for (const l of p.lines ?? [])
        for (const w of l.words ?? []) words.push(w);
  return words;
}

async function ocrPage(page: any, getWorker: () => Promise<any>): Promise<Frag[]> {
  const scale = 2;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, canvas, viewport }).promise;

  const worker = await getWorker();
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  canvas.width = canvas.height = 0; // release memory

  return collectWords(data)
    .filter((w) => w.text && w.text.trim() && w.bbox)
    .map((w) => ({
      str: w.text,
      x: w.bbox.x0 / scale,
      y: w.bbox.y1 / scale, // bottom of the box ~ baseline
      w: (w.bbox.x1 - w.bbox.x0) / scale,
      h: Math.max(4, (w.bbox.y1 - w.bbox.y0) / scale),
    }));
}

// ---------- Main ----------

export async function convertPdfToExcel(
  file: File,
  options: PdfToExcelOptions = {}
): Promise<BrowserConversionResult> {
  assertBrowser();
  const { ocrFallback = false, onProgress } = options;
  const report = (p: number) => onProgress?.(Math.max(0, Math.min(100, Math.round(p))));
  report(2);

  const [pdfjs, XLSX] = await Promise.all([loadPdfJs(), import('xlsx')]);
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const numPages: number = pdf.numPages;

  let ocrWorker: any = null;
  const getWorker = async () => {
    if (!ocrWorker) {
      const { createWorker } = await import('tesseract.js');
      ocrWorker = await createWorker('eng');
    }
    return ocrWorker;
  };

  const wb = XLSX.utils.book_new();
  let sheetsAdded = 0;

  try {
    for (let p = 1; p <= numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      let frags: Frag[] = [];
      for (const it of content.items as any[]) {
        if (typeof it.str !== 'string' || !it.str.trim()) continue; // skips TextMarkedContent
        const t = it.transform as number[];
        const h = it.height || Math.abs(t[3]) || 10;
        frags.push({
          str: it.str,
          x: t[4],
          y: viewport.height - t[5],
          w: it.width || it.str.length * h * 0.5,
          h,
        });
      }

      if (frags.length < 3 && ocrFallback) {
        try { frags = await ocrPage(page, getWorker); } catch (e) { console.warn(`OCR failed on page ${p}`, e); }
      }

      const grid = fragsToGrid(frags);
      page.cleanup();

      if (grid.length) {
        const ws = XLSX.utils.aoa_to_sheet(grid);
        const widths: number[] = [];
        for (const row of grid) row.forEach((v, i) => { widths[i] = Math.max(widths[i] ?? 0, String(v).length); });
        (ws as any)['!cols'] = widths.map((w) => ({ wch: Math.min(60, Math.max(8, w + 2)) }));
        XLSX.utils.book_append_sheet(wb, ws, `Page ${p}`.slice(0, 31));
        sheetsAdded++;
      }
      report(5 + (p / numPages) * 90);
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    if (ocrWorker) await ocrWorker.terminate().catch(() => {});
    await pdf.destroy?.();
  }

  if (!sheetsAdded) {
    throw new Error(
      ocrFallback
        ? 'No text could be extracted from this PDF.'
        : 'No selectable text found. This looks like a scanned PDF - retry with ocrFallback: true.'
    );
  }

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  report(100);

  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    filename: `${file.name.replace(/\.[^./\\]+$/, '') || 'document'}.xlsx`,
    size: blob.size,
    originalSize: file.size,
    pageCount: numPages,
  };
}
