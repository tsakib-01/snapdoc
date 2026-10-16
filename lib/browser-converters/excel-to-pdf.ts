/**
 * lib/browser-converters/excel-to-pdf.ts
 * 100% client-side: .xlsx / .xls / .csv -> styled vector PDF.
 *
 * Deps (all dynamically imported): xlsx, exceljs, jspdf, jspdf-autotable
 *
 * Why two spreadsheet libraries?
 *  - SheetJS (community) is used for values, formatted text (cell.w), number formats,
 *    column widths, row heights and ws['!merges'].
 *  - SheetJS community does NOT expose fonts / borders / alignment from .xlsx files, so for
 *    OOXML files ExcelJS is used as the *style source* (fill, font, color, border, alignment,
 *    theme colors + tint, indexed colors). If ExcelJS is unavailable or fails, we fall back to
 *    whatever SheetJS put in `cell.s` (works with SheetJS Pro / xlsx-js-style shaped data).
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

export interface ExcelToPdfOptions {
  orientation?: 'portrait' | 'landscape'; // default: auto per sheet (landscape if wider than a portrait page)
  onProgress?: (pct: number) => void;
}

/* -------------------------------------------------------------------------- */
/* Types & constants                                                          */
/* -------------------------------------------------------------------------- */

type RGB = [number, number, number];
type SideName = 'top' | 'right' | 'bottom' | 'left';
type HAlign = 'general' | 'left' | 'center' | 'right' | 'justify';
type VAlign = 'top' | 'middle' | 'bottom';

interface BorderSide { style: string; color: RGB }
type Borders = Partial<Record<SideName, BorderSide>>;

interface CellStyle {
  fill?: RGB;
  fontColor?: RGB;
  fontName?: string;
  fontSize?: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  doubleUnderline: boolean;
  strike: boolean;
  h: HAlign;
  v: VAlign;
  wrap: boolean;
  indent: number;
  border: Borders;
}

interface MergeInfo {
  r0: number; c0: number; r1: number; c1: number; // clipped to the used range
  firstRow: number;   // first *visible* row inside the merge
  rowCount: number;   // visible rows inside the merge
  height: number;     // sum of visible row heights (pt)
}

interface SheetModel {
  name: string;
  ws: any;
  ews: any | null;
  rows: number[];  // visible absolute row indexes
  cols: number[];  // visible absolute column indexes
  merges: MergeInfo[];
  mergeAt: Map<number, MergeInfo>;
}

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 28;
const MIN_SCALE = 0.55;      // below this, wide sheets are split into column groups
const DEFAULT_ROW_PT = 15;
const DEFAULT_COL_PX = 64;
const MAX_COL = 16384;
const SIDES: SideName[] = ['top', 'right', 'bottom', 'left'];

// WinAnsi-ish range supported by jsPDF's built-in fonts.
const UNSUPPORTED = /[^\u0009\u000A\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g;

const DEFAULT_THEME = [
  'FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31',
  'A5A5A5', 'FFC000', '5B9BD5', '70AD47', '0563C1', '954F72',
];
const THEME_TAGS = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];

const INDEXED_COLORS = [
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080',
  '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
  '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF',
  '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99',
  '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696',
  '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333',
  '000000', 'FFFFFF',
];

// Excel border style -> PDF line spec (widths in pt at 100% scale).
const BORDER_SPECS: Record<string, { w: number; dash?: number[]; double?: boolean }> = {
  hair: { w: 0.25, dash: [0.6, 0.8] },
  thin: { w: 0.5 },
  medium: { w: 1.2 },
  thick: { w: 2.0 },
  dotted: { w: 0.5, dash: [0.7, 1.3] },
  dashed: { w: 0.5, dash: [3, 2] },
  dashDot: { w: 0.5, dash: [3, 1.5, 0.7, 1.5] },
  dashDotDot: { w: 0.5, dash: [3, 1.2, 0.7, 1.2, 0.7, 1.2] },
  slantDashDot: { w: 1.2, dash: [3, 1.5, 0.7, 1.5] },
  mediumDashed: { w: 1.2, dash: [4, 2] },
  mediumDashDot: { w: 1.2, dash: [4, 1.5, 1, 1.5] },
  mediumDashDotDot: { w: 1.2, dash: [4, 1.2, 1, 1.2, 1, 1.2] },
  double: { w: 0.45, double: true },
};

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function assertBrowser(): void {
  if (typeof window === 'undefined') {
    throw new Error('convertExcelToPdf must run in the browser.');
  }
}

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '') || 'document';
}

function clean(v: unknown): string {
  return String(v ?? '').replace(/\r\n?/g, '\n').replace(UNSUPPORTED, '?').trim();
}

function cellText(cell: any, wrap: boolean): string {
  if (!cell) return '';
  let t: unknown = cell.w;
  if (t == null || t === '') t = cell.v instanceof Date ? cell.v.toLocaleDateString() : cell.v;
  const s = clean(t);
  return wrap ? s : s.replace(/\n+/g, ' ');
}

const mkey = (r: number, c: number) => r * MAX_COL + c;

function emptyStyle(): CellStyle {
  return {
    bold: false, italic: false, underline: false, doubleUnderline: false, strike: false,
    h: 'general', v: 'bottom', wrap: false, indent: 0, border: {},
  };
}

function pdfFont(name?: string): 'helvetica' | 'times' | 'courier' {
  const n = (name || '').toLowerCase();
  if (/courier|consolas|mono|menlo|lucida console|typewriter/.test(n)) return 'courier';
  if (/times|georgia|cambria|garamond|serif|palatino|book antiqua|century|minion/.test(n) && !/sans/.test(n)) return 'times';
  return 'helvetica';
}

function fontStyleOf(s: { bold: boolean; italic: boolean }): 'normal' | 'bold' | 'italic' | 'bolditalic' {
  return s.bold && s.italic ? 'bolditalic' : s.bold ? 'bold' : s.italic ? 'italic' : 'normal';
}

/* -------------------------------------------------------------------------- */
/* Color resolution (rgb / argb / theme+tint / indexed)                       */
/* -------------------------------------------------------------------------- */

function hexToRgb(h: string): RGB {
  const v = parseInt(h.slice(-6), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [0, 1, 2].map((i) => Math.round(a[i] * (1 - t) + b[i] * t)) as RGB;
}

function applyTint(rgb: RGB, tint: number): RGB {
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rr = 0, gg = 0, bb = 0;
  if (h < 60) { rr = c; gg = x; }
  else if (h < 120) { rr = x; gg = c; }
  else if (h < 180) { gg = c; bb = x; }
  else if (h < 240) { gg = x; bb = c; }
  else if (h < 300) { rr = x; bb = c; }
  else { rr = c; bb = x; }
  return [Math.round((rr + m) * 255), Math.round((gg + m) * 255), Math.round((bb + m) * 255)];
}

function parseTheme(xml?: string): string[] {
  if (!xml || typeof xml !== 'string') return DEFAULT_THEME;
  const out = [...DEFAULT_THEME];
  THEME_TAGS.forEach((tag, i) => {
    const block = new RegExp(`<a:${tag}>([\\s\\S]*?)</a:${tag}>`).exec(xml);
    if (!block) return;
    const hex = /(?:srgbClr val|lastClr)="([0-9A-Fa-f]{6})"/.exec(block[1]);
    if (hex) out[i] = hex[1];
  });
  return out;
}

function resolveColor(c: any, theme: string[]): RGB | undefined {
  if (!c || typeof c !== 'object') return undefined;
  let hex: string | undefined;
  const rgb = c.argb ?? c.rgb;
  if (typeof rgb === 'string' && /^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(rgb)) {
    hex = rgb.length === 8 ? rgb.slice(2) : rgb;
  } else if (typeof c.theme === 'number') {
    hex = theme[c.theme];
  } else if (typeof c.indexed === 'number') {
    hex = INDEXED_COLORS[c.indexed];
  }
  if (!hex) return undefined;
  let out = hexToRgb(hex);
  if (typeof c.tint === 'number' && c.tint !== 0) out = applyTint(out, c.tint);
  return out;
}

/* -------------------------------------------------------------------------- */
/* Style readers                                                              */
/* -------------------------------------------------------------------------- */

function mapH(v: unknown): HAlign {
  switch (v) {
    case 'left': return 'left';
    case 'right': return 'right';
    case 'center':
    case 'centerContinuous':
    case 'fill':
      return 'center';
    case 'justify':
    case 'distributed':
      return 'justify';
    default: return 'general';
  }
}

function mapV(v: unknown): VAlign {
  if (v === 'top') return 'top';
  if (v === 'middle' || v === 'center' || v === 'distributed' || v === 'justify') return 'middle';
  return 'bottom';
}

/** ExcelJS cell -> CellStyle (full fidelity for .xlsx). */
function styleFromExcelJs(cell: any, theme: string[]): CellStyle {
  const s = emptyStyle();
  try {
    const f = cell.font;
    if (f) {
      s.bold = !!f.bold;
      s.italic = !!f.italic;
      s.underline = !!f.underline && f.underline !== 'none';
      s.doubleUnderline = f.underline === 'double' || f.underline === 'doubleAccounting';
      s.strike = !!f.strike;
      s.fontName = f.name;
      s.fontSize = typeof f.size === 'number' ? f.size : undefined;
      s.fontColor = resolveColor(f.color, theme);
    }

    const fill = cell.fill;
    if (fill) {
      if (fill.type === 'pattern' && fill.pattern && fill.pattern !== 'none') {
        const fg = resolveColor(fill.fgColor, theme);
        const bg = resolveColor(fill.bgColor, theme);
        if (fill.pattern === 'solid') s.fill = fg ?? bg;
        else if (fg) s.fill = mix(fg, bg ?? [255, 255, 255], 0.5); // approximate hatch patterns
      } else if (fill.type === 'gradient' && Array.isArray(fill.stops) && fill.stops.length) {
        s.fill = resolveColor(fill.stops[0].color, theme);
      }
    }

    const b = cell.border;
    if (b) {
      for (const side of SIDES) {
        const e = b[side];
        if (e && e.style) s.border[side] = { style: e.style, color: resolveColor(e.color, theme) ?? [0, 0, 0] };
      }
    }

    const a = cell.alignment;
    if (a) {
      s.h = mapH(a.horizontal);
      s.v = mapV(a.vertical);
      s.wrap = !!a.wrapText;
      s.indent = Number(a.indent) || 0;
    }
  } catch { /* keep whatever was read */ }
  return s;
}

/** SheetJS `cell.s` (Pro / xlsx-js-style shape) -> CellStyle. Fallback for .xls/.csv. */
function styleFromSheetJs(s: any, theme: string[]): CellStyle {
  const out = emptyStyle();
  if (!s) return out;
  const f = s.font;
  if (f) {
    out.bold = !!f.bold;
    out.italic = !!f.italic;
    out.underline = !!f.underline;
    out.strike = !!f.strike;
    out.fontName = f.name;
    out.fontSize = typeof f.sz === 'number' ? f.sz : undefined;
    out.fontColor = resolveColor(f.color, theme);
  }
  const fl = s.fill ?? (s.fgColor || s.patternType ? s : undefined);
  if (fl && fl.patternType !== 'none') {
    out.fill = resolveColor(fl.fgColor, theme) ?? (fl.patternType === 'solid' ? resolveColor(fl.bgColor, theme) : undefined);
  }
  const b = s.border;
  if (b) {
    for (const side of SIDES) {
      const e = b[side];
      if (e && e.style) out.border[side] = { style: e.style, color: resolveColor(e.color, theme) ?? [0, 0, 0] };
    }
  }
  const a = s.alignment;
  if (a) {
    out.h = mapH(a.horizontal);
    out.v = mapV(a.vertical);
    out.wrap = !!a.wrapText;
    out.indent = Number(a.indent) || 0;
  }
  return out;
}

function ejCell(ews: any, r: number, c: number): any {
  try {
    return typeof ews?.findCell === 'function' ? ews.findCell(r + 1, c + 1) : undefined;
  } catch {
    return undefined;
  }
}

function ejStyled(cell: any): boolean {
  try {
    const f = cell.fill;
    if (f && ((f.type === 'pattern' && f.pattern && f.pattern !== 'none') || f.type === 'gradient')) return true;
    const b = cell.border;
    return !!b && SIDES.some((s) => b[s] && b[s].style);
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Sheet geometry                                                             */
/* -------------------------------------------------------------------------- */

function rowHeightPt(ws: any, r: number): number {
  const m = ws['!rows']?.[r];
  if (m?.hpt) return m.hpt;
  if (m?.hpx) return m.hpx * 0.75;
  return DEFAULT_ROW_PT;
}

function colWidthPt(ws: any, c: number): number {
  const m = ws['!cols']?.[c];
  let px = DEFAULT_COL_PX;
  if (m) {
    if (m.wpx) px = m.wpx;
    else if (m.wch) px = Math.round(m.wch * 7 + 5);
    else if (m.width) px = Math.round(m.width * 7 + 5);
  }
  return Math.max(6, px * 0.75);
}

function buildSheetModel(XLSX: any, name: string, ws: any, ews: any | null): SheetModel | null {
  if (!ws || !ws['!ref']) return null;
  const ref = XLSX.utils.decode_range(ws['!ref']);
  let minR = Infinity, minC = Infinity, maxR = -1, maxC = -1;
  const bump = (r: number, c: number) => {
    if (r < ref.s.r || c < ref.s.c || r > ref.e.r || c > ref.e.c) return;
    if (r < minR) minR = r;
    if (c < minC) minC = c;
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  };

  // 1) cells with values (or SheetJS styles)
  for (const addr in ws) {
    if (addr.charCodeAt(0) === 33 /* ! */) continue;
    const cell = ws[addr];
    if (!cell) continue;
    const hasV = (cell.w != null && String(cell.w).trim() !== '') || (cell.v != null && String(cell.v).trim() !== '');
    const styled = !!(cell.s && (cell.s.fill?.fgColor || cell.s.border));
    if (hasV || styled) {
      const a = XLSX.utils.decode_cell(addr);
      bump(a.r, a.c);
    }
  }
  // 2) styled-but-empty cells (fills / borders) via ExcelJS
  if (ews) {
    try {
      ews.eachRow({ includeEmpty: false }, (row: any, rn: number) => {
        row.eachCell({ includeEmpty: false }, (cell: any, cn: number) => {
          if (ejStyled(cell)) bump(rn - 1, cn - 1);
        });
      });
    } catch { /* ignore */ }
  }
  // 3) merged ranges
  const rawMerges: any[] = ws['!merges'] ?? [];
  for (const mg of rawMerges) {
    bump(mg.s.r, mg.s.c);
    bump(mg.e.r, mg.e.c);
  }
  if (maxR < 0) return null;

  const rowsMeta = ws['!rows'] ?? [];
  const colsMeta = ws['!cols'] ?? [];
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = minR; r <= maxR; r++) if (!rowsMeta[r]?.hidden) rows.push(r);
  for (let c = minC; c <= maxC; c++) if (!colsMeta[c]?.hidden) cols.push(c);
  if (!rows.length || !cols.length) return null;
  const rowSet = new Set(rows);

  const merges: MergeInfo[] = [];
  const mergeAt = new Map<number, MergeInfo>();
  for (const mg of rawMerges) {
    const r0 = mg.s.r, c0 = mg.s.c;
    if (r0 < minR || c0 < minC || r0 > maxR || c0 > maxC) continue;
    const r1 = Math.min(mg.e.r, maxR), c1 = Math.min(mg.e.c, maxC);
    if (r1 === r0 && c1 === c0) continue;
    const info: MergeInfo = { r0, c0, r1, c1, firstRow: -1, rowCount: 0, height: 0 };
    for (let r = r0; r <= r1; r++) {
      if (!rowSet.has(r)) continue;
      if (info.firstRow < 0) info.firstRow = r;
      info.rowCount++;
      info.height += rowHeightPt(ws, r);
    }
    if (info.rowCount === 0) continue;
    merges.push(info);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) mergeAt.set(mkey(r, c), info);
  }

  return { name, ws, ews, rows, cols, merges, mergeAt };
}

function splitColumns(cols: number[], widthOf: (c: number) => number, maxW: number): number[][] {
  const total = cols.reduce((a, c) => a + widthOf(c), 0);
  if (total <= maxW) return [cols];
  const groups: number[][] = [];
  let i = 0;
  while (i < cols.length) {
    const grp: number[] = [];
    let w = 0;
    if (groups.length > 0) { grp.push(cols[0]); w = widthOf(cols[0]); } // repeat first column as a row header
    const startLen = grp.length;
    while (i < cols.length && (grp.length === startLen || w + widthOf(cols[i]) <= maxW)) {
      grp.push(cols[i]);
      w += widthOf(cols[i]);
      i++;
    }
    groups.push(grp);
  }
  return groups;
}

/* -------------------------------------------------------------------------- */
/* Drawing helpers (borders, underline, strike-through)                       */
/* -------------------------------------------------------------------------- */

function drawBorders(doc: any, b: Borders, x: number, y: number, w: number, h: number, scale: number): void {
  const k = Math.max(scale, 0.6);
  for (const side of SIDES) {
    const e = b[side];
    if (!e) continue;
    const spec = BORDER_SPECS[e.style] ?? BORDER_SPECS.thin;
    const horiz = side === 'top' || side === 'bottom';
    const [x1, y1, x2, y2] =
      side === 'top' ? [x, y, x + w, y]
      : side === 'bottom' ? [x, y + h, x + w, y + h]
      : side === 'left' ? [x, y, x, y + h]
      : [x + w, y, x + w, y + h];
    doc.setDrawColor(e.color[0], e.color[1], e.color[2]);
    doc.setLineDashPattern(spec.dash ?? [], 0);
    doc.setLineCap(spec.dash ? 0 : 2);
    const lw = spec.w * k;
    doc.setLineWidth(lw);
    if (spec.double) {
      const off = lw * 1.1;
      if (horiz) { doc.line(x1, y1 - off, x2, y2 - off); doc.line(x1, y1 + off, x2, y2 + off); }
      else { doc.line(x1 - off, y1, x2 - off, y2); doc.line(x1 + off, y1, x2 + off, y2); }
    } else {
      doc.line(x1, y1, x2, y2);
    }
  }
  doc.setLineDashPattern([], 0);
  doc.setLineCap(0);
}

function drawTextDecor(doc: any, meta: any, pos: { x: number; y: number }, lines: string[], fs: number): void {
  const st: CellStyle = meta.style;
  const [r, g, b] = st.fontColor ?? [0, 0, 0];
  doc.setDrawColor(r, g, b);
  doc.setLineDashPattern([], 0);
  doc.setLineCap(0);
  doc.setLineWidth(Math.max(0.3, fs * 0.055));
  doc.setFont(pdfFont(st.fontName), fontStyleOf(st));
  doc.setFontSize(fs);
  const lh = fs * (doc.getLineHeightFactor?.() ?? 1.15);
  const blockH = lines.length * lh;
  // autotable passes valign as jsPDF baseline, so pos.y is the top / middle / bottom of the block
  const top0 = meta.valign === 'top' ? pos.y : meta.valign === 'bottom' ? pos.y - blockH : pos.y - blockH / 2;
  lines.forEach((line, i) => {
    if (!line) return;
    const tw = doc.getTextWidth(line);
    const sx = meta.align === 'right' ? pos.x - tw : meta.align === 'center' ? pos.x - tw / 2 : pos.x;
    const top = top0 + i * lh;
    if (st.underline) {
      const uy = top + fs * 0.9;
      doc.line(sx, uy, sx + tw, uy);
      if (st.doubleUnderline) doc.line(sx, uy + fs * 0.1, sx + tw, uy + fs * 0.1);
    }
    if (st.strike) {
      const sy = top + fs * 0.5;
      doc.line(sx, sy, sx + tw, sy);
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export async function convertExcelToPdf(
  file: File,
  options: ExcelToPdfOptions = {}
): Promise<BrowserConversionResult> {
  assertBrowser();
  const { orientation, onProgress } = options;
  const report = (p: number) => onProgress?.(Math.max(0, Math.min(100, Math.round(p))));
  report(2);

  const [XLSX, { jsPDF }, autoTableMod] = await Promise.all([
    import('xlsx'),
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable: any = (autoTableMod as any).default ?? (autoTableMod as any).autoTable;

  // ---- Read workbook with SheetJS (values, formats, widths, merges) ----
  const isText = /\.(csv|tsv|txt)$/i.test(file.name) || file.type === 'text/csv';
  const isOoxml = /\.(xlsx|xlsm|xltx|xltm)$/i.test(file.name);
  const readOpts = { cellStyles: true, cellDates: true, cellNF: true };
  let buffer: ArrayBuffer | null = null;
  let wb: any;
  if (isText) {
    wb = XLSX.read(await file.text(), { type: 'string', raw: false, ...readOpts });
  } else {
    buffer = await file.arrayBuffer();
    wb = XLSX.read(buffer, { type: 'array', ...readOpts });
  }
  report(12);

  // ---- Read styles with ExcelJS (OOXML only) ----
  let ewb: any = null;
  let theme = parseTheme(wb?.Themes?.themeXLSX);
  if (isOoxml && buffer) {
    try {
      const mod: any = await import('exceljs');
      const EJ = mod.default ?? mod;
      ewb = new EJ.Workbook();
      await ewb.xlsx.load(buffer.slice(0));
      const themeXml = ewb._themes?.theme1 ?? ewb.model?.themes?.theme1;
      if (themeXml) theme = parseTheme(themeXml);
    } catch (e) {
      console.warn('ExcelJS style read failed - falling back to SheetJS styles', e);
      ewb = null;
    }
  }
  report(22);

  // ---- Collect non-empty, visible sheets ----
  const models: SheetModel[] = [];
  (wb.SheetNames as string[]).forEach((name, idx) => {
    if (wb.Workbook?.Sheets?.[idx]?.Hidden) return;
    const model = buildSheetModel(XLSX, clean(name) || 'Sheet', wb.Sheets[name], ewb ? ewb.getWorksheet(name) ?? null : null);
    if (model) models.push(model);
  });
  if (!models.length) throw new Error('The spreadsheet contains no data.');

  const getStyle = (m: SheetModel, r: number, c: number): CellStyle => {
    if (m.ews && typeof m.ews.findCell === 'function') {
      const ec = ejCell(m.ews, r, c);
      return ec ? styleFromExcelJs(ec, theme) : emptyStyle();
    }
    const sc = m.ws[XLSX.utils.encode_cell({ r, c })];
    return sc?.s ? styleFromSheetJs(sc.s, theme) : emptyStyle();
  };

  // ---- Build PDF ----
  let doc: any = null;

  for (let s = 0; s < models.length; s++) {
    const m = models[s];
    const widthMap = new Map<number, number>();
    m.cols.forEach((c) => widthMap.set(c, colWidthPt(m.ws, c)));
    const widthOf = (c: number) => widthMap.get(c) ?? 48;
    const totalW = m.cols.reduce((a, c) => a + widthOf(c), 0);

    const orient: 'portrait' | 'landscape' = orientation ?? (totalW <= A4_W - 2 * MARGIN ? 'portrait' : 'landscape');
    const avail = (orient === 'landscape' ? A4_H : A4_W) - 2 * MARGIN;
    const groups = splitColumns(m.cols, widthOf, avail / MIN_SCALE);

    // merge info per column group (first column inside the group + span)
    for (let g = 0; g < groups.length; g++) {
      const cols = groups[g];
      const gw = cols.reduce((a, c) => a + widthOf(c), 0);
      const scale = Math.min(1, (avail - 1) / gw);

      const groupInfoCache = new Map<MergeInfo, { firstCol: number; span: number } | null>();
      const groupInfo = (mg: MergeInfo) => {
        if (groupInfoCache.has(mg)) return groupInfoCache.get(mg)!;
        const inCols = cols.filter((c) => c >= mg.c0 && c <= mg.c1);
        const v = inCols.length ? { firstCol: inCols[0], span: inCols.length } : null;
        groupInfoCache.set(mg, v);
        return v;
      };

      const makeCell = (r: number, c: number, mg: MergeInfo | undefined, span: number) => {
        const mr = mg ? mg.r0 : r;
        const mc = mg ? mg.c0 : c;
        const st = getStyle(m, mr, mc);
        const sj = m.ws[XLSX.utils.encode_cell({ r: mr, c: mc })];
        const text = cellText(sj, st.wrap);

        // Borders: a merged range keeps its outer edges on its corner cells.
        let border: Borders = st.border;
        if (mg) {
          const tl = st.border;
          const tr = getStyle(m, mg.r0, mg.c1).border;
          const bl = getStyle(m, mg.r1, mg.c0).border;
          const br = getStyle(m, mg.r1, mg.c1).border;
          border = {
            top: tl.top ?? tr.top,
            left: tl.left ?? bl.left,
            right: tr.right ?? br.right ?? tl.right,
            bottom: bl.bottom ?? br.bottom ?? tl.bottom,
          };
        }

        let align: 'left' | 'center' | 'right';
        if (st.h === 'left' || st.h === 'center' || st.h === 'right') align = st.h;
        else if (st.h === 'justify') align = 'left';
        else if (sj && (sj.t === 'n' || sj.t === 'd')) align = 'right';
        else if (sj && (sj.t === 'b' || sj.t === 'e')) align = 'center';
        else align = 'left';

        const fontSize = Math.max(3, (st.fontSize ?? 11) * scale);
        const indentPad = st.indent * 6 * scale;
        const padding = {
          top: 1.2 * scale,
          bottom: 1.2 * scale,
          left: 2 * scale + (align === 'left' ? indentPad : 0),
          right: 2 * scale + (align === 'right' ? indentPad : 0),
        };

        let overflow: 'linebreak' | 'visible' | 'hidden' = 'hidden';
        if (st.wrap) overflow = 'linebreak';
        else if (align === 'left' && text && !mg) {
          const next = m.ws[XLSX.utils.encode_cell({ r, c: c + 1 })];
          if (!next || cellText(next, false) === '') overflow = 'visible'; // Excel lets text spill into empty neighbours
        }

        const minH = (mg ? mg.height : rowHeightPt(m.ws, r)) * scale;

        return {
          content: text,
          colSpan: span,
          rowSpan: mg ? mg.rowCount : 1,
          meta: { style: st, border, align, valign: st.v, fontSize, padding, overflow, minH, scale },
        };
      };

      // body rows
      const body: any[][] = [];
      for (const r of m.rows) {
        const row: any[] = [];
        for (const c of cols) {
          const mg = m.mergeAt.get(mkey(r, c));
          if (mg) {
            const info = groupInfo(mg);
            if (!info || r !== mg.firstRow || c !== info.firstCol) continue; // covered by a merge
            row.push(makeCell(r, c, mg, info.span));
          } else {
            row.push(makeCell(r, c, undefined, 1));
          }
        }
        body.push(row);
      }

      const columnStyles: Record<number, any> = {};
      cols.forEach((c, i) => { columnStyles[i] = { cellWidth: widthOf(c) * scale }; });

      if (!doc) doc = new jsPDF({ orientation: orient, unit: 'pt', format: 'a4' });
      else doc.addPage('a4', orient);
      const d = doc;

      const title = groups.length > 1 ? `${m.name} (columns part ${g + 1}/${groups.length})` : m.name;
      d.setFontSize(12);
      d.setTextColor(30, 41, 59);
      d.text(title, MARGIN, MARGIN + 6);

      const queue: Array<() => void> = []; // borders / decorations drawn on top once the page is complete

      autoTable(d, {
        body,
        startY: MARGIN + 18,
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN + 10, left: MARGIN },
        theme: 'plain',
        tableWidth: 'wrap',
        columnStyles,
        styles: { fontSize: 8, cellPadding: 1, lineWidth: 0 },
        didParseCell: (data: any) => {
          if (data.section !== 'body') return;
          const meta = data.cell.raw?.meta;
          if (!meta) return;
          const st: CellStyle = meta.style;
          const cs = data.cell.styles;
          cs.font = pdfFont(st.fontName);
          cs.fontStyle = fontStyleOf(st);
          cs.fontSize = meta.fontSize;
          cs.textColor = st.fontColor ?? [0, 0, 0];
          if (st.fill) cs.fillColor = st.fill;
          cs.halign = meta.align;
          cs.valign = meta.valign;
          cs.overflow = meta.overflow;
          cs.cellPadding = meta.padding;
          cs.lineWidth = 0;
          cs.minCellHeight = meta.minH;
        },
        didDrawCell: (data: any) => {
          if (data.section !== 'body') return;
          const meta = data.cell.raw?.meta;
          if (!meta) return;
          const { x, y, width, height } = data.cell;
          const b: Borders = meta.border;
          if (SIDES.some((sd) => b[sd])) queue.push(() => drawBorders(d, b, x, y, width, height, meta.scale));
          if ((meta.style.underline || meta.style.strike) && typeof data.cell.getTextPos === 'function') {
            const pos = data.cell.getTextPos();
            const lines: string[] = Array.isArray(data.cell.text) ? data.cell.text.slice() : [String(data.cell.text ?? '')];
            const fs = data.cell.styles.fontSize;
            queue.push(() => drawTextDecor(d, meta, pos, lines, fs));
          }
        },
        didDrawPage: () => {
          for (const fn of queue) fn();
          queue.length = 0;
          d.setLineDashPattern([], 0);
          const w = d.internal.pageSize.getWidth();
          const h = d.internal.pageSize.getHeight();
          d.setFont('helvetica', 'normal');
          d.setFontSize(8);
          d.setTextColor(120);
          d.text(`Page ${d.getNumberOfPages()}`, w - MARGIN, h - 14, { align: 'right' });
        },
      });
    }
    report(22 + ((s + 1) / models.length) * 73);
    await new Promise((r) => setTimeout(r, 0));
  }

  const pdf = doc!;
  const blob = pdf.output('blob') as Blob;
  report(100);

  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    filename: `${baseName(file.name)}.pdf`,
    size: blob.size,
    originalSize: file.size,
    pageCount: pdf.getNumberOfPages(),
  };
}
