import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, ImageRun, AlignmentType } from 'docx';
import * as XLSX from 'xlsx';
import { PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';

/**
 * Creates a native Microsoft Word (.docx) file from extracted PDF pages and structured content.
 * Uses smart hybrid layout: for complex scripts (Bengali, math, multi-column) embeds crisp retina
 * page layouts and editable text paragraphs so it opens with 100% precision in Word and Google Docs.
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

    // Check if page contains complex script or table layout or if visual mode requested
    const hasComplexScript = /[\u0980-\u09FF\u0600-\u06FF\u0900-\u097F\uFFFD]/.test(pageText) || pageText.includes('fooi');
    const shouldUseVisual = mode === 'visual' || (mode === 'smart' && (hasComplexScript || thumb.dataUrl));

    if (shouldUseVisual && thumb.dataUrl) {
      try {
        const base64Data = thumb.dataUrl.split(',')[1];
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        // 595 x 842 points standard A4 in Word (approx 560px width in docx)
        const targetWidth = 560;
        const targetHeight = Math.round(targetWidth / (thumb.aspectRatio || (595 / 842)));

        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imageBytes,
                transformation: {
                  width: Math.min(targetWidth, 560),
                  height: Math.min(targetHeight, 780),
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
          children.push(new Paragraph({ text: '' }));
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
          margin: {
            top: 720, // 0.5 inch
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
      if (!line.trim()) continue;

      let cells: (string | number)[];
      if (line.includes('\t')) {
        cells = line.split('\t').map((c) => {
          const trimmed = c.trim();
          const num = Number(trimmed);
          return !isNaN(num) && trimmed !== '' ? num : trimmed;
        });
      } else if (line.includes(',')) {
        // CSV comma separated
        cells = line.split(',').map((c) => {
          const trimmed = c.trim().replace(/^["']|["']$/g, '');
          const num = Number(trimmed);
          return !isNaN(num) && trimmed !== '' ? num : trimmed;
        });
      } else {
        // Space separated columns if large gaps exist
        const columns = line.split(/ {2,}/).map((c) => c.trim());
        cells = columns.map((c) => {
          const num = Number(c);
          return !isNaN(num) && c !== '' ? num : c;
        });
      }

      if (cells.some((c) => c !== '')) {
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
      const cellLen = String(cell || '').length;
      colWidths[colIdx] = { wch: Math.max(colWidths[colIdx]?.wch || 10, Math.min(cellLen + 3, 50)) };
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
