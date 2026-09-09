import fs from "fs/promises";
import path from "path";
// @ts-ignore
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import * as XLSX from "xlsx";

export class PdfToExcelError extends Error {}

interface ConvertOptions {
  /** Absolute path to the input .pdf file */
  inputPath: string;
  /** Directory to write the converted .xlsx into */
  outputDir: string;
  /**
   * Vertical distance (in PDF points) within which two text items are
   * considered to be on the same row. Tune per document if rows are
   * splitting or merging incorrectly.
   */
  rowToleranceY?: number;
  /**
   * Horizontal distance (in PDF points) within which two text items are
   * merged into the same column/cell rather than split into two.
   */
  columnToleranceX?: number;
}

interface PositionedItem {
  text: string;
  x: number;
  y: number;
}

/**
 * Converts a .pdf file to .xlsx by extracting text with its (x, y) position
 * on each page and clustering items into rows/columns.
 *
 * IMPORTANT: table detection from raw PDF coordinates is inherently
 * heuristic. This works well for PDFs with clean grid-like tables
 * (consistent column x-positions) and less well for freeform layouts.
 * For complex/nested tables, consider a dedicated table-extraction service
 * (e.g. a Python microservice using `camelot` or `tabula`) instead.
 *
 * Returns the absolute path to the generated XLSX.
 */
export async function convertPdfToExcel({
  inputPath,
  outputDir,
  rowToleranceY = 4,
  columnToleranceX = 10,
}: ConvertOptions): Promise<string> {
  try {
    await fs.access(inputPath);
  } catch {
    throw new PdfToExcelError(`Input file not found: ${inputPath}`);
  }

  if (path.extname(inputPath).toLowerCase() !== ".pdf") {
    throw new PdfToExcelError(`Unsupported input extension. Expected .pdf`);
  }

  await fs.mkdir(outputDir, { recursive: true });

  const data = new Uint8Array(await fs.readFile(inputPath));
  const workbook = XLSX.utils.book_new();

  let loadingTask;
  try {
    loadingTask = pdfjsLib.getDocument({ data });
  } catch (err: any) {
    throw new PdfToExcelError(`Failed to open PDF: ${err.message}`);
  }

  const pdfDoc = await loadingTask.promise;

  if (pdfDoc.numPages === 0) {
    throw new PdfToExcelError("PDF has no pages.");
  }

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();

    const items: PositionedItem[] = content.items
      .filter((item: any) => "str" in item && item.str.trim().length > 0)
      .map((item: any) => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
      }));

    if (items.length === 0) {
      continue; // blank page or image-only page — nothing to tabulate
    }

    const rows = groupIntoRows(items, rowToleranceY);
    const grid = rows.map((row) => groupIntoColumns(row, columnToleranceX));

    const sheet = XLSX.utils.aoa_to_sheet(grid);
    const sheetName = pdfDoc.numPages > 1 ? `Page ${pageNum}` : "Sheet1";
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  }

  if (workbook.SheetNames.length === 0) {
    throw new PdfToExcelError(
      "No extractable text found on any page (this PDF may be a scanned image — OCR is not yet supported for PDF-to-Excel)."
    );
  }

  const baseName = path.basename(inputPath, ".pdf");
  const outputPath = path.join(outputDir, `${baseName}.xlsx`);
  XLSX.writeFile(workbook, outputPath);

  return outputPath;
}

/**
 * Groups positioned text items into rows based on y-coordinate proximity.
 * PDF coordinates have origin at bottom-left, so we sort descending by y
 * (top of page first).
 */
function groupIntoRows(items: PositionedItem[], tolerance: number): PositionedItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const rows: PositionedItem[][] = [];

  for (const item of sorted) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(lastRow[0].y - item.y) <= tolerance) {
      lastRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  return rows;
}

/**
 * Within a single row, groups items into columns based on x-coordinate
 * proximity, then returns their text content left-to-right.
 * Items closer together than `tolerance` are merged into one cell
 * (handles multi-word cell values that PDF text extraction splits up).
 */
function groupIntoColumns(row: PositionedItem[], tolerance: number): string[] {
  const sorted = [...row].sort((a, b) => a.x - b.x);
  const cells: string[] = [];
  let currentCellText = sorted[0].text;
  let currentCellEndX = sorted[0].x;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const gap = item.x - currentCellEndX;

    if (gap <= tolerance) {
      // Same cell — likely a continuation of the same word/phrase
      currentCellText += item.text;
    } else {
      // New cell/column
      cells.push(currentCellText.trim());
      currentCellText = item.text;
    }
    currentCellEndX = item.x + item.text.length; // rough estimate of item width
  }
  cells.push(currentCellText.trim());

  return cells;
}
