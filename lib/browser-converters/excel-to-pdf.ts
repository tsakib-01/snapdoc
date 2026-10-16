/**
 * lib/browser-converters/excel-to-pdf.ts
 * 100% client-side: .xlsx / .xls / .csv -> formatted vector PDF table.
 * Deps: xlsx, jspdf, jspdf-autotable (all dynamically imported).
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
  orientation?: 'portrait' | 'landscape'; // default: auto per sheet (landscape if > 6 columns)
  onProgress?: (pct: number) => void;
}

const MAX_COLS_PER_TABLE = 12; // wider sheets are split into column groups (first column repeated)
// Characters jsPDF's built-in fonts can render (WinAnsi). Everything else becomes '?'.
const UNSUPPORTED = /[^\u0009\u000A\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g;
const NUMERIC = /^[-+(]?[$€£]?\s?\d[\d,]*(\.\d+)?%?\)?$/;

function assertBrowser(): void {
  if (typeof window === 'undefined') {
    throw new Error('convertExcelToPdf must run in the browser.');
  }
}

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '') || 'document';
}

function clean(v: unknown): string {
  return String(v ?? '').replace(UNSUPPORTED, '?').trim();
}

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

  // ---- Read workbook ----
  const isText = /\.(csv|tsv|txt)$/i.test(file.name) || file.type === 'text/csv';
  const wb = isText
    ? XLSX.read(await file.text(), { type: 'string', raw: false })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  report(15);

  // ---- Collect non-empty sheets ----
  const sheets: { name: string; rows: string[][] }[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const raw = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    });
    let lastCol = -1;
    for (const r of raw) {
      for (let c = r.length - 1; c > lastCol; c--) {
        if (String(r[c] ?? '').trim() !== '') { lastCol = c; break; }
      }
    }
    if (lastCol < 0) continue;
    const rows = raw.map((r) => {
      const out: string[] = [];
      for (let c = 0; c <= lastCol; c++) out.push(clean(r[c]));
      return out;
    });
    sheets.push({ name: clean(name) || 'Sheet', rows });
  }
  if (!sheets.length) throw new Error('The spreadsheet contains no data.');

  // ---- Build PDF ----
  let doc: InstanceType<typeof jsPDF> | null = null;
  const firstOrient = (cols: number) => orientation ?? (cols > 6 ? 'landscape' : 'portrait');
  const margin = 28;

  for (let s = 0; s < sheets.length; s++) {
    const { name, rows } = sheets[s];
    const totalCols = rows[0].length;
    const orient = firstOrient(Math.min(totalCols, MAX_COLS_PER_TABLE));

    // Column groups: [0..11], [0, 12..22], ...
    const groups: number[][] = [];
    if (totalCols <= MAX_COLS_PER_TABLE) {
      groups.push(Array.from({ length: totalCols }, (_, i) => i));
    } else {
      const step = MAX_COLS_PER_TABLE - 1;
      for (let start = 1; start < totalCols; start += step) {
        const idx = [0];
        for (let c = start; c < Math.min(start + step, totalCols); c++) idx.push(c);
        groups.push(idx);
      }
    }

    for (let g = 0; g < groups.length; g++) {
      if (!doc) doc = new jsPDF({ orientation: orient, unit: 'pt', format: 'a4' });
      else doc.addPage('a4', orient);

      const cols = groups[g];
      const fontSize = cols.length > 10 ? 6 : cols.length > 7 ? 7 : 8;
      const title = groups.length > 1 ? `${name} (columns part ${g + 1}/${groups.length})` : name;
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(title, margin, margin + 6);

      const pick = (r: string[]) => cols.map((c) => r[c] ?? '');
      const head = [pick(rows[0])];
      const body = rows.length > 1 ? rows.slice(1).map(pick) : [];

      autoTable(doc, {
        head,
        body,
        startY: margin + 18,
        margin: { top: margin, right: margin, bottom: margin + 10, left: margin },
        theme: 'grid',
        styles: { fontSize, cellPadding: 2.5, overflow: 'linebreak', valign: 'middle', lineColor: [226, 232, 240], lineWidth: 0.4 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data: any) => {
          if (data.section === 'body' && NUMERIC.test(String(data.cell.raw ?? '').trim())) {
            data.cell.styles.halign = 'right';
          }
        },
        didDrawPage: () => {
          const w = doc!.internal.pageSize.getWidth();
          const h = doc!.internal.pageSize.getHeight();
          doc!.setFontSize(8);
          doc!.setTextColor(120);
          doc!.text(`Page ${doc!.getNumberOfPages()}`, w - margin, h - 14, { align: 'right' });
        },
      });
    }
    report(15 + ((s + 1) / sheets.length) * 80);
    await new Promise((r) => setTimeout(r, 0)); // let the UI breathe
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
