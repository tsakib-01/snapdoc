/**
 * lib/browser-converters/text-to-excel.ts
 * 100% client-side: OCR / extracted text (string, .txt/.csv/.tsv file, or image) -> .xlsx
 * Uses a delimiter-detecting line parser. Images are OCR'd with tesseract.js.
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

export interface TextToExcelOptions {
  /** 'auto' (default) | ',' | ';' | '\t' | '|' | 'spaces' (2+ spaces) | any custom string */
  delimiter?: string;
  onProgress?: (pct: number) => void;
}

const SPACES = '\u0000spaces'; // internal token for "2+ spaces"

function assertBrowser(): void {
  if (typeof window === 'undefined') throw new Error('convertTextToExcel must run in the browser.');
}

// ---------- Parsing ----------

function splitLine(line: string, delim: string, quotes: boolean): string[] {
  if (delim === SPACES) return line.trim().split(/\s{2,}/).map((s) => s.trim());
  if (delim === '|') {
    let t = line.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|')) t = t.slice(0, -1);
    return t.split('|').map((s) => s.trim());
  }
  if (!quotes) return line.split(delim).map((s) => s.trim());

  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
    } else if (!inQ && line.startsWith(delim, i)) {
      out.push(cur);
      cur = '';
      i += delim.length - 1;
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectDelimiter(lines: string[]): string | null {
  const sample = lines.slice(0, 300);
  const candidates = ['\t', '|', ';', ',', SPACES];
  let best: string | null = null;
  let bestScore = 0;
  for (const d of candidates) {
    const counts = sample.map((l) => splitLine(l, d, d !== SPACES && d !== '|').length);
    const freq = new Map<number, number>();
    counts.forEach((c) => freq.set(c, (freq.get(c) ?? 0) + 1));
    let mode = 1;
    let modeN = 0;
    freq.forEach((n, c) => { if (n > modeN || (n === modeN && c > mode)) { mode = c; modeN = n; } });
    if (mode < 2 || modeN / sample.length < 0.6) continue;
    const score = modeN * Math.min(mode, 12);
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

function coerce(s: string): string | number {
  const t = s.trim();
  if (/^-?\d+(\.\d+)?$/.test(t) && !(t.length > 1 && t.startsWith('0') && !t.includes('.'))) return Number(t);
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return Number(t.replace(/,/g, ''));
  return s;
}

function normalizeDelimiter(d?: string): string | 'auto' {
  if (!d || d === 'auto') return 'auto';
  if (d === 'spaces') return SPACES;
  if (d === '\\t' || d.toLowerCase() === 'tab') return '\t';
  return d;
}

function parseText(text: string, delimOpt: string | 'auto', quotes: boolean): (string | number)[][] {
  let lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, ''));
  lines = lines.filter((l) => l.trim() !== '');
  if (!lines.length) return [];

  let delim: string | null = delimOpt === 'auto' ? detectDelimiter(lines) : delimOpt;
  // Drop markdown-style separator rows such as |---|---|
  if (delim === '|') lines = lines.filter((l) => !(/^[\s|:+-]+$/.test(l) && l.includes('-')));

  const rows = lines.map((l) => (delim ? splitLine(l, delim, quotes && delim !== SPACES) : [l.trim()]));
  const width = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => {
    const padded = r.concat(new Array(width - r.length).fill(''));
    return padded.map(coerce);
  });
}

// ---------- OCR (images) ----------

function collectWords(data: any): any[] {
  if (Array.isArray(data?.words) && data.words.length) return data.words;
  const words: any[] = [];
  for (const b of data?.blocks ?? [])
    for (const p of b.paragraphs ?? [])
      for (const l of p.lines ?? [])
        for (const w of l.words ?? []) words.push(w);
  return words;
}

/** OCR an image and rebuild lines, inserting TABs where there are wide horizontal gaps. */
async function ocrImageToText(file: File, report: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') report(10 + m.progress * 80);
    },
  } as any);
  try {
    const { data } = await (worker as any).recognize(file, {}, { blocks: true });
    const words = collectWords(data).filter((w) => w.text?.trim() && w.bbox);
    if (!words.length) return (data?.text as string) ?? '';

    const hs = words.map((w) => w.bbox.y1 - w.bbox.y0).sort((a: number, b: number) => a - b);
    const med = hs[Math.floor(hs.length / 2)] || 12;
    const tol = med * 0.6;
    const sorted = [...words].sort((a, b) => a.bbox.y1 - b.bbox.y1);

    const lines: any[][] = [];
    let cur: any[] = [];
    let sum = 0;
    for (const w of sorted) {
      if (cur.length && Math.abs(w.bbox.y1 - sum / cur.length) > tol) { lines.push(cur); cur = []; sum = 0; }
      cur.push(w);
      sum += w.bbox.y1;
    }
    if (cur.length) lines.push(cur);

    return lines
      .map((ln) => {
        ln.sort((a, b) => a.bbox.x0 - b.bbox.x0);
        let s = ln[0].text;
        for (let i = 1; i < ln.length; i++) {
          const gap = ln[i].bbox.x0 - ln[i - 1].bbox.x1;
          s += (gap > med * 1.5 ? '\t' : ' ') + ln[i].text;
        }
        return s;
      })
      .join('\n');
  } finally {
    await worker.terminate().catch(() => {});
  }
}

// ---------- Main ----------

export async function convertTextToExcel(
  input: string | File,
  options: TextToExcelOptions = {}
): Promise<BrowserConversionResult> {
  assertBrowser();
  const report = (p: number) => options.onProgress?.(Math.max(0, Math.min(100, Math.round(p))));
  report(2);

  const XLSX = await import('xlsx');
  let delimOpt = normalizeDelimiter(options.delimiter);
  let text: string;
  let quotes = true;
  let originalSize: number;
  let base = 'extracted-text';

  if (typeof input === 'string') {
    text = input;
    originalSize = new Blob([input]).size;
  } else {
    originalSize = input.size;
    base = input.name.replace(/\.[^./\\]+$/, '') || base;
    const isImage = input.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(input.name);
    if (isImage) {
      text = await ocrImageToText(input, report);
      quotes = false; // OCR noise: stray quotes must not swallow a line
      if (delimOpt === 'auto') delimOpt = '\t'; // we inserted tabs at column gaps
    } else {
      text = await input.text();
    }
  }
  report(92);

  const rows = parseText(text, delimOpt, quotes);
  if (!rows.length) throw new Error('No text found to convert.');

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const widths: number[] = [];
  for (const r of rows) r.forEach((v, i) => { widths[i] = Math.max(widths[i] ?? 0, String(v).length); });
  (ws as any)['!cols'] = widths.map((w) => ({ wch: Math.min(60, Math.max(8, w + 2)) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  report(100);

  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    filename: `${base}.xlsx`,
    size: blob.size,
    originalSize,
  };
}
