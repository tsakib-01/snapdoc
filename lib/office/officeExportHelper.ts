import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, ImageRun, AlignmentType } from 'docx';
import * as XLSX from 'xlsx';
import { PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';

/**
 * Creates a native Microsoft Word (.docx) file from extracted PDF pages and structured content.
 * Uses smart hybrid layout: embeds crisp full-bleed page layouts with 0 margins so there are
 * no unwanted white border gaps on top, bottom, left, and right.
 */
export async function createWordDocx(
  pagesText: string[],
  thumbnails: PdfPageThumbnail[],
  options: { mode?: 'smart' | 'visual' | 'text'; title?: string } = {}
): Promise<Blob> {
  const mode = options.mode || 'smart';
  const sections: any[] = [];

  for (let i = 0; i < thumbnails.length; i++) {
    const thumb = thumbnails[i];
    const pageText = pagesText[i] || '';
    const children: any[] = [];

    const hasComplexScript = /[\u0980-\u09FF\u0600-\u06FF\u0900-\u097F\uFFFD]/.test(pageText) || pageText.includes('fooi');
    const shouldUseVisual = mode === 'visual' || (mode === 'smart' && (hasComplexScript || thumb.dataUrl));

    if (shouldUseVisual && thumb.dataUrl) {
      try {
        const base64Data = thumb.dataUrl.split(',')[1];
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        // Full A4 page width in docx units (595 pt = 794 px)
        const targetWidth = 595;
        const targetHeight = Math.round(targetWidth / (thumb.aspectRatio || (595 / 842)));

        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0, line: 240 },
            children: [
              new ImageRun({
                data: imageBytes,
                transformation: {
                  width: targetWidth,
                  height: targetHeight,
                },
                type: 'png',
              }),
            ],
          })
        );
      } catch (err) {
        console.warn('Could not embed page image, falling back to text:', err);
      }
    }

    // Also add text structure if text mode or if text is clean
    if (mode === 'text' || (!shouldUseVisual && pageText.trim())) {
      const lines = pageText.split('\n');

      for (const line of lines) {
        if (!line.trim()) {
          children.push(new Paragraph({ text: '', spacing: { before: 0, after: 0 } }));
          continue;
        }

        // Check if line is a table row (has tab delimiters)
        if (line.includes('\t')) {
          const cells = line.split('\t').map((c) => c.trim());
          const tableRow = new TableRow({
            children: cells.map(
              (cellText) =>
                new TableCell({
                  width: { size: Math.floor(100 / Math.max(cells.length, 1)), type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: cellText, size: 20 })] })],
                })
            ),
          });

          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [tableRow],
            })
          );
        } else {
          children.push(
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: line,
                  size: 22, // 11pt font
                  font: 'Calibri',
                }),
              ],
            })
          );
        }
      }
    }

    sections.push({
      properties: {
        page: {
          margin: shouldUseVisual
            ? {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }
            : {
                top: 540,
                right: 540,
                bottom: 540,
                left: 540,
              },
        },
      },
      children: children.length > 0 ? children : [new Paragraph({ text: '' })],
    });
  }

  const doc = new Document({
    title: options.title || 'Converted Document',
    sections: sections.length > 0 ? sections : [{ children: [new Paragraph({ text: '' })] }],
  });

  return await Packer.toBlob(doc);
}

/**
 * Creates a native Microsoft Excel (.xlsx) workbook from extracted PDF tables and structured text.
 */
export function createExcelWorkbook(pagesText: string[]): Blob {
  const allRows: (string | number)[][] = [];

  for (const pageText of pagesText) {
    const lines = pageText.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      let cells: (string | number)[];
      if (line.includes('\t')) {
        cells = line.split('\t').map((c) => parseCellString(c));
      } else if (line.includes(',') && !line.includes('  ')) {
        // CSV comma separated
        cells = line.split(',').map((c) => parseCellString(c.replace(/^["']|["']$/g, '')));
      } else {
        // Space separated columns (separated by 2 or more spaces)
        const columns = line.split(/ {2,}/).map((c) => c.trim()).filter(Boolean);
        cells = columns.map((c) => parseCellString(c));
      }

      if (cells.length > 0 && cells.some((c) => c !== '')) {
        allRows.push(cells);
      }
    }
  }

  // If no rows found, add at least one empty row
  if (allRows.length === 0) {
    allRows.push(['No table content detected in PDF']);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(allRows);

  // Auto calculate column widths
  const colWidths: { wch: number }[] = [];
  allRows.forEach((row) => {
    row.forEach((cell, colIdx) => {
      const cellLen = String(cell ?? '').length;
      colWidths[colIdx] = { wch: Math.max(colWidths[colIdx]?.wch || 12, Math.min(cellLen + 4, 60)) };
    });
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted Data');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function parseCellString(val: string): string | number {
  const trimmed = val.trim();
  if (!trimmed) return '';

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
  }

  const currencyMatch = trimmed.match(/^\$\s*([0-9,]+(\.[0-9]+)?)$/);
  if (currencyMatch) {
    const num = Number(currencyMatch[1].replace(/,/g, ''));
    if (!isNaN(num)) {
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  return trimmed;
}
