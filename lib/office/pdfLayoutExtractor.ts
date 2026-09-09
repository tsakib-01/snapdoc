import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel } from 'docx';
import { createWorker } from 'tesseract.js';

export interface ExtractedTableData {
  pageNumber: number;
  tables: string[][][];
  rawRows: (string | number)[][] ;
}

/**
 * Fallback OCR using Tesseract.js when PDF contains scanned images without selectable text layer.
 */
async function performOcrFallback(pdfBuffer: Buffer): Promise<string[]> {
  try {
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer), verbosity: 0 });
    const screenshotResult = await parser.getScreenshot({ scale: 2.0, imageDataUrl: true });
    await parser.destroy().catch(() => {});

    if (!screenshotResult?.pages || screenshotResult.pages.length === 0) {
      return [];
    }

    const worker = await createWorker('eng');
    const ocrPages: string[] = [];

    for (const page of screenshotResult.pages) {
      if (page.dataUrl) {
        const ret = await worker.recognize(page.dataUrl);
        ocrPages.push(ret.data.text || '');
      }
    }

    await worker.terminate();
    return ocrPages;
  } catch (err) {
    console.warn('OCR Fallback error:', err);
    return [];
  }
}

/**
 * Parses a PDF buffer in native Node.js and extracts structured tables and text layout.
 */
export async function extractPdfStructuredContent(pdfBuffer: Buffer): Promise<{
  tablesPerPage: ExtractedTableData[];
  pagesText: string[];
}> {
  const parser = new PDFParse({
    data: new Uint8Array(pdfBuffer),
    verbosity: 0,
  });

  try {
    const tableResult = await parser.getTable().catch(() => null);
    const textResult = await parser.getText({
      lineEnforce: true,
      cellSeparator: '\t',
      cellThreshold: 8,
      lineThreshold: 5,
    });

    let pagesText: string[] = (textResult?.pages || []).map((p) => p.text);

    // Check if the PDF has virtually no extractable text layer (scanned document)
    const totalChars = pagesText.reduce((sum, t) => sum + t.replace(/\s+/g, '').length, 0);
    if (totalChars < 30) {
      const ocrResults = await performOcrFallback(pdfBuffer);
      if (ocrResults.length > 0) {
        pagesText = ocrResults;
      }
    }

    const tablesPerPage: ExtractedTableData[] = [];
    const pageCount = Math.max(
      tableResult?.pages?.length || 0,
      pagesText.length,
      1
    );

    for (let p = 1; p <= pageCount; p++) {
      const pageText = pagesText[p - 1] || '';
      const pageTableObj = tableResult?.pages?.find((pt) => pt.num === p);
      const pageTables: string[][][] = [];

      if (pageTableObj && pageTableObj.tables && pageTableObj.tables.length > 0) {
        for (const tbl of pageTableObj.tables) {
          if (tbl && tbl.length > 0) {
            pageTables.push(tbl as string[][]);
          }
        }
      }

      // If no vector tables detected on this page, parse 2D text coordinate rows
      const rawRows: (string | number)[][] = [];

      if (pageTables.length > 0) {
        for (const tbl of pageTables) {
          for (const row of tbl) {
            rawRows.push(
              row.map((cell) => {
                const trimmed = String(cell || '').trim();
                const num = Number(trimmed.replace(/,/g, ''));
                return !isNaN(num) && trimmed !== '' && !trimmed.startsWith('0') ? num : trimmed;
              })
            );
          }
        }
      } else {
        const lines = pageText.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;

          let cells: (string | number)[];
          if (line.includes('\t')) {
            cells = line.split('\t').map((c) => {
              const trimmed = c.trim();
              const num = Number(trimmed.replace(/,/g, ''));
              return !isNaN(num) && trimmed !== '' && !trimmed.startsWith('0') ? num : trimmed;
            });
          } else if (line.includes(',')) {
            cells = line.split(',').map((c) => {
              const trimmed = c.trim().replace(/^["']|["']$/g, '');
              const num = Number(trimmed.replace(/,/g, ''));
              return !isNaN(num) && trimmed !== '' && !trimmed.startsWith('0') ? num : trimmed;
            });
          } else {
            const cols = line.split(/ {2,}/).map((c) => c.trim());
            cells = cols.map((c) => {
              const num = Number(c.replace(/,/g, ''));
              return !isNaN(num) && c !== '' && !c.startsWith('0') ? num : c;
            });
          }

          if (cells.some((c) => String(c).length > 0)) {
            rawRows.push(cells);
          }
        }
      }

      tablesPerPage.push({
        pageNumber: p,
        tables: pageTables,
        rawRows,
      });
    }

    return { tablesPerPage, pagesText };
  } finally {
    try {
      await parser.destroy();
    } catch {
      // Ignore cleanup error
    }
  }
}

/**
 * Builds a valid Microsoft Excel (.xlsx) buffer from parsed PDF coordinate layouts using SheetJS.
 */
export async function convertPdfToExcelBuffer(pdfBuffer: Buffer): Promise<Buffer> {
  const { tablesPerPage } = await extractPdfStructuredContent(pdfBuffer);
  const workbook = XLSX.utils.book_new();

  let sheetCount = 0;

  for (const page of tablesPerPage) {
    if (page.rawRows.length === 0) continue;

    const worksheet = XLSX.utils.aoa_to_sheet(page.rawRows);

    // Auto-compute column widths based on maximum content length
    const colWidths: { wch: number }[] = [];
    page.rawRows.forEach((row) => {
      row.forEach((cell, colIdx) => {
        const cellLen = String(cell ?? '').length;
        colWidths[colIdx] = {
          wch: Math.max(colWidths[colIdx]?.wch || 10, Math.min(cellLen + 3, 60)),
        };
      });
    });
    worksheet['!cols'] = colWidths;

    const sheetName = `Page ${page.pageNumber}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    sheetCount++;
  }

  // If no content found, create default sheet
  if (sheetCount === 0) {
    const defaultSheet = XLSX.utils.aoa_to_sheet([['No tabular data detected in PDF']]);
    XLSX.utils.book_append_sheet(workbook, defaultSheet, 'Sheet 1');
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return Buffer.from(excelBuffer);
}

/**
 * Reconstructs an editable Microsoft Word (.docx) document from parsed PDF bounding boxes,
 * vector tables, and OCR layers.
 */
export async function convertPdfToWordBuffer(pdfBuffer: Buffer, title?: string): Promise<Buffer> {
  const { tablesPerPage, pagesText } = await extractPdfStructuredContent(pdfBuffer);
  const sections: any[] = [];

  for (let pIdx = 0; pIdx < tablesPerPage.length; pIdx++) {
    const pageData = tablesPerPage[pIdx];
    const pageText = pagesText[pIdx] || '';
    const children: any[] = [];

    // 1. If vector tables were detected, render them as native Word Tables
    if (pageData.tables && pageData.tables.length > 0) {
      for (const tbl of pageData.tables) {
        const tableRows: TableRow[] = [];
        const colCount = Math.max(...tbl.map((r) => r.length), 1);
        const colWidthPct = Math.floor(100 / colCount);

        for (const row of tbl) {
          const cells: TableCell[] = row.map(
            (cellText) =>
              new TableCell({
                width: { size: colWidthPct, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: String(cellText || '').trim(),
                        size: 20, // 10pt
                        font: 'Calibri',
                      }),
                    ],
                  }),
                ],
              })
          );
          tableRows.push(new TableRow({ children: cells }));
        }

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          })
        );
      }
    } else {
      // 2. Render structured lines and paragraphs
      const lines = pageText.split('\n');

      for (const line of lines) {
        if (!line.trim()) {
          children.push(new Paragraph({ text: '' }));
          continue;
        }

        // Check if tabbed columns
        if (line.includes('\t')) {
          const cols = line.split('\t').map((c) => c.trim()).filter(Boolean);
          if (cols.length > 1) {
            const tableRow = new TableRow({
              children: cols.map(
                (colText) =>
                  new TableCell({
                    width: { size: Math.floor(100 / cols.length), type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: colText,
                            size: 22,
                            font: 'Calibri',
                          }),
                        ],
                      }),
                    ],
                  })
              ),
            });

            children.push(
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [tableRow],
              })
            );
            continue;
          }
        }

        // Regular line / paragraph
        const trimmed = line.trim();
        const isHeading = trimmed.length < 50 && (
          (trimmed.toUpperCase() === trimmed && /[A-Z]/.test(trimmed)) ||
          trimmed.endsWith(':') ||
          /^(\d+\.|\d+\)|\b(Chapter|Section|Part)\b)/i.test(trimmed)
        );

        children.push(
          new Paragraph({
            heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
            children: [
              new TextRun({
                text: line,
                bold: isHeading,
                size: isHeading ? 26 : 22,
                font: 'Calibri',
              }),
            ],
          })
        );
      }
    }

    sections.push({
      properties: {
        page: {
          margin: {
            top: 720,
            right: 720,
            bottom: 720,
            left: 720,
          },
        },
      },
      children: children.length > 0 ? children : [new Paragraph({ text: '' })],
    });
  }

  const doc = new Document({
    title: title || 'Converted Document',
    sections: sections.length > 0 ? sections : [{ children: [new Paragraph({ text: '' })] }],
  });

  return await Packer.toBuffer(doc);
}
