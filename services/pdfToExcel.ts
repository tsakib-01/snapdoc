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
  x0: number;
  x1: number;
  y0: number;
  width: number;
  height: number;
}

interface MergedToken {
  text: string;
  x0: number;
  x1: number;
  y0: number;
}

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Converts a .pdf file to .xlsx:
 * - First attempts Tabula/pdfplumber engine (exact multi-column & bordered/stream table extraction).
 * - Falls back to native Node coordinate clustering and XLSX generator if needed.
 */
export async function convertPdfToExcel({
  inputPath,
  outputDir,
  rowToleranceY = 4,
  columnToleranceX = 6,
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

  const baseName = path.basename(inputPath, ".pdf");
  const outputPath = path.join(outputDir, `${baseName}.xlsx`);
  const scriptPath = path.join(process.cwd(), "scripts", "convert_engine.py");

  // 1. Attempt Tabula-style pdfplumber via Python
  try {
    await execFileAsync("python", [scriptPath, "pdf2excel", inputPath, outputPath], {
      timeout: 90000,
    });
    await fs.access(outputPath);
    return outputPath;
  } catch (pyErr: any) {
    console.warn("pdf2excel Python execution failed or fallback triggered:", pyErr.message);
  }

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

    const rawItems: PositionedItem[] = [];

    for (const item of content.items) {
      if (!("str" in item) || typeof item.str !== "string") continue;
      const str = item.str;
      if (!str) continue;

      const x = item.transform[4];
      const y = item.transform[5];
      const width = item.width > 0 ? item.width : str.length * 6;
      const height = item.height > 0 ? item.height : Math.abs(item.transform[0]) || 10;

      rawItems.push({
        text: str,
        x0: x,
        x1: x + width,
        y0: y,
        width,
        height,
      });
    }

    if (rawItems.length === 0) {
      continue;
    }

    // 1. Group items into rows by Y coordinate
    const rows = groupItemsIntoRows(rawItems, rowToleranceY);

    // 2. Within each row, merge close text fragments into tokens (e.g., words/phrases in same cell)
    const tokenRows: MergedToken[][] = rows.map((row) => mergeRowTokens(row, columnToleranceX));

    // 3. Detect global column boundaries across all rows on this page
    const columnAnchors = detectColumnAnchors(tokenRows);

    // 4. Map each token row into aligned column grid
    const grid: (string | number)[][] = [];

    for (const rowTokens of tokenRows) {
      if (columnAnchors.length === 0) {
        grid.push(rowTokens.map((t) => parseCellValue(t.text)));
        continue;
      }

      const gridRow: (string | number)[] = new Array(columnAnchors.length).fill("");

      for (const token of rowTokens) {
        const colIdx = findBestColumnIndex(token, columnAnchors);
        if (colIdx >= 0 && colIdx < columnAnchors.length) {
          if (gridRow[colIdx] === "") {
            gridRow[colIdx] = parseCellValue(token.text);
          } else {
            // Append if multiple tokens land in the same column
            gridRow[colIdx] = `${gridRow[colIdx]} ${token.text.trim()}`;
          }
        }
      }

      // Filter out completely empty rows
      if (gridRow.some((val) => val !== "")) {
        grid.push(gridRow);
      }
    }

    if (grid.length === 0) continue;

    const sheet = XLSX.utils.aoa_to_sheet(grid);

    // Auto calculate column widths
    const colWidths: { wch: number }[] = [];
    grid.forEach((row) => {
      row.forEach((cell, colIdx) => {
        const cellLen = String(cell ?? "").length;
        colWidths[colIdx] = {
          wch: Math.max(colWidths[colIdx]?.wch || 12, Math.min(cellLen + 4, 60)),
        };
      });
    });
    sheet["!cols"] = colWidths;

    const sheetName = pdfDoc.numPages > 1 ? `Page ${pageNum}` : "Sheet1";
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  }

  if (workbook.SheetNames.length === 0) {
    throw new PdfToExcelError(
      "No extractable text found on any page (this PDF may be a scanned image)."
    );
  }

  XLSX.writeFile(workbook, outputPath);

  return outputPath;
}

/**
 * Groups items into rows based on vertical Y coordinates (PDF y is descending).
 */
function groupItemsIntoRows(items: PositionedItem[], tolerance: number): PositionedItem[][] {
  const sorted = [...items].sort((a, b) => b.y0 - a.y0);
  const rows: PositionedItem[][] = [];

  for (const item of sorted) {
    let placed = false;
    for (const row of rows) {
      const avgY = row.reduce((sum, i) => sum + i.y0, 0) / row.length;
      if (Math.abs(avgY - item.y0) <= tolerance) {
        row.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rows.push([item]);
    }
  }

  // Sort each row left to right
  for (const row of rows) {
    row.sort((a, b) => a.x0 - b.x0);
  }

  // Sort rows top to bottom
  rows.sort((a, b) => {
    const avgYA = a.reduce((sum, i) => sum + i.y0, 0) / a.length;
    const avgYB = b.reduce((sum, i) => sum + i.y0, 0) / b.length;
    return avgYB - avgYA;
  });

  return rows;
}

/**
 * Merges text fragments within a row that belong to the same cell/token.
 */
function mergeRowTokens(row: PositionedItem[], columnToleranceX: number): MergedToken[] {
  if (row.length === 0) return [];

  const tokens: MergedToken[] = [];
  let current: MergedToken = {
    text: row[0].text,
    x0: row[0].x0,
    x1: row[0].x1,
    y0: row[0].y0,
  };

  for (let i = 1; i < row.length; i++) {
    const item = row[i];
    const gap = item.x0 - current.x1;

    // If gap is small (less than threshold), merge as part of the same cell content
    if (gap <= columnToleranceX) {
      const needsSpace =
        !current.text.endsWith(" ") &&
        !item.text.startsWith(" ") &&
        gap > 1.5;
      current.text += (needsSpace ? " " : "") + item.text;
      current.x1 = Math.max(current.x1, item.x1);
    } else {
      tokens.push({
        ...current,
        text: current.text.trim(),
      });
      current = {
        text: item.text,
        x0: item.x0,
        x1: item.x1,
        y0: item.y0,
      };
    }
  }

  tokens.push({
    ...current,
    text: current.text.trim(),
  });

  return tokens.filter((t) => t.text.length > 0);
}

/**
 * Discovers distinct column start coordinates across the document rows.
 */
function detectColumnAnchors(rows: MergedToken[][]): number[] {
  // Collect all token start X positions
  const xPositions: number[] = [];
  for (const row of rows) {
    for (const token of row) {
      xPositions.push(token.x0);
    }
  }

  if (xPositions.length === 0) return [];

  xPositions.sort((a, b) => a - b);

  // Cluster X positions within 15pt into single column anchors
  const anchors: number[] = [];
  let currentCluster: number[] = [xPositions[0]];

  for (let i = 1; i < xPositions.length; i++) {
    const x = xPositions[i];
    const clusterAvg = currentCluster.reduce((s, v) => s + v, 0) / currentCluster.length;
    if (Math.abs(x - clusterAvg) <= 18) {
      currentCluster.push(x);
    } else {
      anchors.push(clusterAvg);
      currentCluster = [x];
    }
  }

  if (currentCluster.length > 0) {
    anchors.push(currentCluster.reduce((s, v) => s + v, 0) / currentCluster.length);
  }

  return anchors.sort((a, b) => a - b);
}

/**
 * Finds the closest column index for a given token.
 */
function findBestColumnIndex(token: MergedToken, anchors: number[]): number {
  if (anchors.length === 0) return 0;

  let bestIdx = 0;
  let minDiff = Infinity;

  for (let i = 0; i < anchors.length; i++) {
    const diff = Math.abs(token.x0 - anchors[i]);
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Parses raw text into numeric or clean value if applicable.
 */
function parseCellValue(text: string): string | number {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Check for plain integers or decimals (e.g. "15", "1200", "1200.50")
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
  }

  // Check for currency formatted numbers (e.g. "$1,200.00" or "$18,000")
  const currencyMatch = trimmed.match(/^\$\s*([0-9,]+(\.[0-9]+)?)$/);
  if (currencyMatch) {
    const cleanNum = Number(currencyMatch[1].replace(/,/g, ""));
    if (!isNaN(cleanNum)) {
      return `$${cleanNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  return trimmed;
}
