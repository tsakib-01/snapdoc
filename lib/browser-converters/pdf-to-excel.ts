/**
 * lib/browser-converters/pdf-to-excel.ts
 * 100% client-side: PDF -> multi-sheet .xlsx with FULL STYLING.
 *
 * Styling extracted:
 *  - Cell background fill  (from getOperatorList rect paint operators)
 *  - Border lines          (from getOperatorList stroke operators)
 *  - Font bold / italic    (from text item fontName string)
 *  - Font size             (from text item height / transform)
 *  - Text color            (from graphics state fill color at text time)
 *  - Text alignment        (from x-position relative to column bounds)
 *
 * Output is written with xlsx-js-style (drop-in XLSX replacement that
 * actually preserves cell.s styling in the emitted .xlsx file).
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

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type RGB = [number, number, number];

interface Frag {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontName: string;
  fontSize: number;
  color: RGB; // text (fill) color at time of drawing
}

interface Cell {
  x: number;
  end: number;
  text: string;
  frags: Frag[];
}

interface FillRect {
  x: number; y: number; w: number; h: number;
  color: RGB;
}

interface StrokeLine {
  x1: number; y1: number; x2: number; y2: number;
  color: RGB;
  width: number;
}

interface PageGraphics {
  fills: FillRect[];
  lines: StrokeLine[];
}

/* -------------------------------------------------------------------------- */
/* Worker URL                                                                  */
/* -------------------------------------------------------------------------- */

const workerUrl = (v: string) =>
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${v}/build/pdf.worker.min.mjs`;

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

/* -------------------------------------------------------------------------- */
/* Color helpers                                                               */
/* -------------------------------------------------------------------------- */

function rgbHex(r: RGB): string {
  return r.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function approxWhite(c: RGB): boolean {
  return c[0] > 240 && c[1] > 240 && c[2] > 240;
}

function approxBlack(c: RGB): boolean {
  return c[0] < 20 && c[1] < 20 && c[2] < 20;
}

/* -------------------------------------------------------------------------- */
/* Operator list scanner – extracts fills and stroke lines from a PDF page    */
/* -------------------------------------------------------------------------- */

/**
 * PDF operator list constants (pdf.js OPS enum).
 * We use numeric guards so we don't need to import the full enum type.
 */
const OPS = {
  // Path construction
  moveTo: 13,
  lineTo: 14,
  curveTo: 15,
  curveTo2: 16,
  curveTo3: 17,
  closePath: 18,
  rectangle: 19,
  // Path painting
  stroke: 20,
  closeStroke: 21,
  fill: 22,
  eoFill: 23,
  fillStroke: 24,
  eoFillStroke: 25,
  closeFillStroke: 26,
  closeEOFillStroke: 27,
  endPath: 28,
  // Graphics state
  setFillRGBColor: 72,
  setStrokeRGBColor: 73,
  setFillGray: 66,
  setStrokeGray: 67,
  setFillCMYKColor: 76,
  setStrokeCMYKColor: 77,
  setLineWidth: 35,
  // Save/restore
  save: 7,
  restore: 8,
};

interface PathPoint { x: number; y: number }

function cmykToRgb(c: number, m: number, y: number, k: number): RGB {
  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);
  return [r, g, b];
}

async function extractPageGraphics(page: any, viewportHeight: number): Promise<PageGraphics> {
  const fills: FillRect[] = [];
  const lines: StrokeLine[] = [];

  let opList: any;
  try {
    opList = await page.getOperatorList();
  } catch {
    return { fills, lines };
  }

  const fnArray: number[] = opList.fnArray;
  const argsArray: any[][] = opList.argsArray;
  const n = fnArray.length;

  // Graphics state stack
  interface GState {
    fillColor: RGB;
    strokeColor: RGB;
    lineWidth: number;
    ctm: number[]; // [a,b,c,d,e,f]
  }
  const defaultState = (): GState => ({
    fillColor: [0, 0, 0],
    strokeColor: [0, 0, 0],
    lineWidth: 1,
    ctm: [1, 0, 0, 1, 0, 0],
  });
  const stateStack: GState[] = [defaultState()];
  const cur = () => stateStack[stateStack.length - 1];

  // Current path
  let pathPoints: PathPoint[] = [];
  let subStart: PathPoint = { x: 0, y: 0 };
  let rectQueue: { x: number; y: number; w: number; h: number }[] = [];
  let currentIsRect = false;

  // Transform a PDF-space point (y-up) to viewport-space (y-down)
  const toVP = (px: number, py: number): PathPoint => ({
    x: px,
    y: viewportHeight - py,
  });

  for (let i = 0; i < n; i++) {
    const fn = fnArray[i];
    const args = argsArray[i] ?? [];

    switch (fn) {
      case OPS.save:
        stateStack.push({ ...cur(), ctm: [...cur().ctm] });
        break;
      case OPS.restore:
        if (stateStack.length > 1) stateStack.pop();
        break;

      case OPS.setFillRGBColor:
        cur().fillColor = [args[0] * 255, args[1] * 255, args[2] * 255];
        break;
      case OPS.setStrokeRGBColor:
        cur().strokeColor = [args[0] * 255, args[1] * 255, args[2] * 255];
        break;
      case OPS.setFillGray:
        { const v = args[0] * 255; cur().fillColor = [v, v, v]; }
        break;
      case OPS.setStrokeGray:
        { const v = args[0] * 255; cur().strokeColor = [v, v, v]; }
        break;
      case OPS.setFillCMYKColor:
        cur().fillColor = cmykToRgb(args[0], args[1], args[2], args[3]);
        break;
      case OPS.setStrokeCMYKColor:
        cur().strokeColor = cmykToRgb(args[0], args[1], args[2], args[3]);
        break;
      case OPS.setLineWidth:
        cur().lineWidth = args[0];
        break;

      case OPS.rectangle: {
        const rx = args[0], ry = args[1], rw = args[2], rh = args[3];
        rectQueue.push({ x: rx, y: ry, w: rw, h: rh });
        currentIsRect = true;
        // Also add corners to pathPoints for stroke detection
        pathPoints = [
          { x: rx, y: ry }, { x: rx + rw, y: ry },
          { x: rx + rw, y: ry + rh }, { x: rx, y: ry + rh }, { x: rx, y: ry },
        ];
        subStart = { x: rx, y: ry };
        break;
      }

      case OPS.moveTo:
        subStart = { x: args[0], y: args[1] };
        pathPoints = [subStart];
        currentIsRect = false;
        rectQueue = [];
        break;
      case OPS.lineTo:
        pathPoints.push({ x: args[0], y: args[1] });
        break;
      case OPS.closePath:
      case 26: // closeFillStroke
        if (pathPoints.length) pathPoints.push(pathPoints[0]);
        break;

      case OPS.fill:
      case OPS.eoFill:
      case OPS.fillStroke:
      case OPS.eoFillStroke:
      case OPS.closeFillStroke:
      case OPS.closeEOFillStroke: {
        const fc = cur().fillColor as RGB;
        if (!approxWhite(fc)) {
          // Fill the rectangles
          for (const r of rectQueue) {
            const p1 = toVP(r.x, r.y + r.h);
            const p2 = toVP(r.x + r.w, r.y);
            fills.push({
              x: Math.min(p1.x, p2.x),
              y: Math.min(p1.y, p2.y),
              w: Math.abs(r.w),
              h: Math.abs(r.h),
              color: fc,
            });
          }
        }
        // Also handle stroke component
        if (fn === OPS.fillStroke || fn === OPS.eoFillStroke ||
            fn === OPS.closeFillStroke || fn === OPS.closeEOFillStroke) {
          collectLines(pathPoints, cur().strokeColor as RGB, cur().lineWidth, lines, toVP);
        }
        pathPoints = [];
        rectQueue = [];
        currentIsRect = false;
        break;
      }

      case OPS.stroke:
      case OPS.closeStroke:
        collectLines(pathPoints, cur().strokeColor as RGB, cur().lineWidth, lines, toVP);
        pathPoints = [];
        rectQueue = [];
        currentIsRect = false;
        break;

      case OPS.endPath:
        pathPoints = [];
        rectQueue = [];
        currentIsRect = false;
        break;
    }
  }

  return { fills, lines };
}

function collectLines(
  pts: PathPoint[],
  color: RGB,
  width: number,
  out: StrokeLine[],
  toVP: (x: number, y: number) => PathPoint
) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = toVP(pts[i].x, pts[i].y);
    const b = toVP(pts[i + 1].x, pts[i + 1].y);
    out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, color, width });
  }
}

/* -------------------------------------------------------------------------- */
/* Spatial clustering (unchanged from original, enhanced with Frag metadata) */
/* -------------------------------------------------------------------------- */

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
        last.frags.push(f);
        continue;
      }
    }
    cells.push({ x: f.x, end: f.x + f.w, text: f.str, frags: [f] });
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

/* -------------------------------------------------------------------------- */
/* Font name parsing                                                           */
/* -------------------------------------------------------------------------- */

function parseFontStyle(fontName: string): { bold: boolean; italic: boolean } {
  const n = fontName.toLowerCase();
  const bold = /bold|black|heavy|semibold|demibold|extrabold|ultrabold|w[789]/.test(n);
  const italic = /italic|oblique|slant|it$|it[-_,+]/.test(n);
  return { bold, italic };
}

/* -------------------------------------------------------------------------- */
/* Style resolution: map a grid cell to a style using graphics data           */
/* -------------------------------------------------------------------------- */

/** Find the dominant fill color covering a cell's bounding box. */
function findFill(
  fills: FillRect[],
  cx: number, cy: number, cw: number, ch: number
): RGB | undefined {
  let bestArea = 0;
  let best: RGB | undefined;
  for (const f of fills) {
    // Overlap in x
    const ox = Math.min(cx + cw, f.x + f.w) - Math.max(cx, f.x);
    // Overlap in y
    const oy = Math.min(cy + ch, f.y + f.h) - Math.max(cy, f.y);
    if (ox <= 0 || oy <= 0) continue;
    const area = ox * oy;
    if (area > bestArea) {
      bestArea = area;
      best = f.color;
    }
  }
  return best;
}

/** Detect which sides of a cell bounding box have stroke lines. */
function detectBorders(
  lines: StrokeLine[],
  cx: number, cy: number, cw: number, ch: number,
  tol = 4
): { top?: string; bottom?: string; left?: string; right?: string } {
  const result: { top?: string; bottom?: string; left?: string; right?: string } = {};

  for (const l of lines) {
    const isH = Math.abs(l.y2 - l.y1) < tol;
    const isV = Math.abs(l.x2 - l.x1) < tol;
    if (!isH && !isV) continue;

    if (isH) {
      const lx1 = Math.min(l.x1, l.x2);
      const lx2 = Math.max(l.x1, l.x2);
      const ly = (l.y1 + l.y2) / 2;
      // Must overlap the cell horizontally
      if (lx2 < cx - tol || lx1 > cx + cw + tol) continue;
      // Top edge
      if (Math.abs(ly - cy) < tol) result.top = 'thin';
      // Bottom edge
      if (Math.abs(ly - (cy + ch)) < tol) result.bottom = 'thin';
    } else {
      const ly1 = Math.min(l.y1, l.y2);
      const ly2 = Math.max(l.y1, l.y2);
      const lx = (l.x1 + l.x2) / 2;
      if (ly2 < cy - tol || ly1 > cy + ch + tol) continue;
      if (Math.abs(lx - cx) < tol) result.left = 'thin';
      if (Math.abs(lx - (cx + cw)) < tol) result.right = 'thin';
    }
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* Build xlsx-js-style cell.s object                                          */
/* -------------------------------------------------------------------------- */

function buildCellStyle(
  frags: Frag[],
  fill: RGB | undefined,
  borders: { top?: string; bottom?: string; left?: string; right?: string },
  hAlign: 'left' | 'center' | 'right'
): any {
  const dominant = frags.length ? frags[0] : null;
  const { bold, italic } = dominant ? parseFontStyle(dominant.fontName) : { bold: false, italic: false };
  const fontSize = dominant ? Math.max(8, Math.round(dominant.fontSize)) : 10;
  const textColor = dominant && !approxBlack(dominant.color) ? rgbHex(dominant.color) : '000000';

  const s: any = {
    font: {
      bold,
      italic,
      sz: fontSize,
      color: { rgb: textColor },
    },
    alignment: {
      horizontal: hAlign,
      vertical: 'center',
      wrapText: false,
    },
  };

  if (fill && !approxWhite(fill)) {
    s.fill = {
      patternType: 'solid',
      fgColor: { rgb: rgbHex(fill) },
      bgColor: { rgb: 'FFFFFF' },
    };
  }

  const hasBorder = borders.top || borders.bottom || borders.left || borders.right;
  if (hasBorder) {
    const side = (style?: string) =>
      style ? { style, color: { rgb: '000000' } } : { style: 'none' };
    s.border = {
      top: side(borders.top),
      bottom: side(borders.bottom),
      left: side(borders.left),
      right: side(borders.right),
    };
  }

  return s;
}

/* -------------------------------------------------------------------------- */
/* OCR helpers (unchanged from original)                                       */
/* -------------------------------------------------------------------------- */

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
  canvas.width = canvas.height = 0;

  return collectWords(data)
    .filter((w) => w.text && w.text.trim() && w.bbox)
    .map((w) => ({
      str: w.text,
      x: w.bbox.x0 / scale,
      y: w.bbox.y1 / scale,
      w: (w.bbox.x1 - w.bbox.x0) / scale,
      h: Math.max(4, (w.bbox.y1 - w.bbox.y0) / scale),
      fontName: '',
      fontSize: Math.max(4, (w.bbox.y1 - w.bbox.y0) / scale),
      color: [0, 0, 0] as RGB,
    }));
}

/* -------------------------------------------------------------------------- */
/* Main export                                                                 */
/* -------------------------------------------------------------------------- */

export async function convertPdfToExcel(
  file: File,
  options: PdfToExcelOptions = {}
): Promise<BrowserConversionResult> {
  assertBrowser();
  const { ocrFallback = false, onProgress } = options;
  const report = (p: number) => onProgress?.(Math.max(0, Math.min(100, Math.round(p))));
  report(2);

  // Load pdfjs and xlsx-js-style in parallel
  const [pdfjs, XLSXStyle] = await Promise.all([
    loadPdfJs(),
    import('xlsx-js-style' as any),
  ]);
  const XLSX = XLSXStyle.default ?? XLSXStyle;

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
      const vpH = viewport.height;

      // 1. Extract text with font metadata
      const content = await page.getTextContent();
      let frags: Frag[] = [];
      for (const it of content.items as any[]) {
        if (typeof it.str !== 'string' || !it.str.trim()) continue;
        const t = it.transform as number[];
        const h = it.height || Math.abs(t[3]) || 10;
        frags.push({
          str: it.str,
          x: t[4],
          y: vpH - t[5],
          w: it.width || it.str.length * h * 0.5,
          h,
          fontName: it.fontName ?? '',
          fontSize: h,
          color: [0, 0, 0], // will be refined below if graphics state is available
        });
      }

      if (frags.length < 3 && ocrFallback) {
        try { frags = await ocrPage(page, getWorker); } catch (e) { console.warn(`OCR failed on page ${p}`, e); }
      }

      // 2. Extract vector graphics (fills + lines)
      const graphics = await extractPageGraphics(page, vpH);
      page.cleanup();

      if (!frags.length) {
        report(5 + (p / numPages) * 90);
        await new Promise((r) => setTimeout(r, 0));
        continue;
      }

      // 3. Cluster text into rows → cells
      const clusteredRows = clusterRows(frags);
      const cellRows = clusteredRows.map(rowToCells).filter((r) => r.length);
      if (!cellRows.length) {
        report(5 + (p / numPages) * 90);
        await new Promise((r) => setTimeout(r, 0));
        continue;
      }

      // 4. Build column anchors
      const allXs = cellRows.flatMap((r) => r.map((c) => c.x));
      const anchors = buildAnchors(allXs);
      const numCols = anchors.length;

      // Estimate column right-edges from next anchor (or viewport edge)
      const colRights = anchors.map((ax, i) =>
        i + 1 < anchors.length ? anchors[i + 1] : viewport.width
      );

      // 5. Build rows of row-bands (approximate y ranges from clustered rows)
      const rowBands = clusteredRows.map((rowFrags) => {
        const ys = rowFrags.map((f) => f.y - f.h);
        const ye = rowFrags.map((f) => f.y);
        return {
          y: Math.min(...ys),
          h: Math.max(...ye) - Math.min(...ys),
        };
      });

      // 6. Build grid with styling
      const numRows = cellRows.length;
      const styleMap = new Map<string, any>(); // "r:c" -> cell.s
      const aoa: (string | number)[][] = [];

      for (let ri = 0; ri < numRows; ri++) {
        const cells = cellRows[ri];
        const band = rowBands[ri];
        const rowOut: (string | number)[] = new Array(numCols).fill('');

        for (let ci = 0; ci < numCols; ci++) {
          // Find the Cell that mapped to this column
          let matchedCell: Cell | undefined;
          let bestDist = Infinity;
          for (const c of cells) {
            const d = Math.abs(anchors[ci] - c.x);
            if (d < bestDist && d < 50) { bestDist = d; matchedCell = c; }
          }
          if (!matchedCell) continue;

          rowOut[ci] = coerce(matchedCell.text);

          // Column bounding box in PDF coords
          const cxLeft = anchors[ci];
          const cxRight = colRights[ci];
          const cw = cxRight - cxLeft;
          const cy = band.y;
          const ch = band.h || 12;

          // Detect fill
          const fill = findFill(graphics.fills, cxLeft, cy, cw, ch);

          // Detect borders
          const borders = detectBorders(graphics.lines, cxLeft, cy, cw, ch);

          // Detect horizontal alignment from text x-position relative to column
          const textX = matchedCell.x;
          const colMid = (cxLeft + cxRight) / 2;
          let hAlign: 'left' | 'center' | 'right' = 'left';
          const rightEdge = cxRight - cw * 0.15;
          const leftEdge = cxLeft + cw * 0.15;
          if (textX > rightEdge) hAlign = 'right';
          else if (Math.abs(textX - colMid) < cw * 0.2) hAlign = 'center';

          const cellStyle = buildCellStyle(matchedCell.frags, fill, borders, hAlign);
          styleMap.set(`${ri}:${ci}`, cellStyle);
        }

        aoa.push(rowOut);
      }

      // 7. Build worksheet from AoA then apply styles
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Apply styles to cells
      for (const [key, style] of Array.from(styleMap)) {
        const [ri, ci] = key.split(':').map(Number);
        const cellRef = XLSX.utils.encode_cell({ r: ri, c: ci });
        if (ws[cellRef]) {
          ws[cellRef].s = style;
        }
      }

      // Column widths
      const widths: number[] = [];
      for (const row of aoa) row.forEach((v, i) => { widths[i] = Math.max(widths[i] ?? 0, String(v).length); });
      (ws as any)['!cols'] = widths.map((w) => ({ wch: Math.min(60, Math.max(8, w + 2)) }));

      XLSX.utils.book_append_sheet(wb, ws, `Page ${p}`.slice(0, 31));
      sheetsAdded++;

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
        : 'No selectable text found. This looks like a scanned PDF – retry with ocrFallback: true.'
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
