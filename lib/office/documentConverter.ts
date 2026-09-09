import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * Sanitizes any text string so that pdf-lib's standard fonts (WinAnsi encoding)
 * never throw "WinAnsi cannot encode ..." errors.
 */
export function sanitizeWinAnsiText(str: string): string {
  if (!str) return '';
  return str
    // Normalize newlines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Common Unicode typography replacements
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '*')
    .replace(/\u00A0/g, ' ')
    .replace(/\t/g, '    ')
    // Remove non-printable control characters except newline
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Map any characters outside WinAnsi range (0x20-0x7E, 0xA0-0xFF, \n) to ASCII or space
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, (char) => {
      const code = char.charCodeAt(0);
      if (code >= 0x0100 && code <= 0x017F) {
        return char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      }
      return ' ';
    });
}

/**
 * Extracts clean text content from Word (.docx), Excel (.xlsx, .xls), CSV, HTML, and TXT files.
 */
export async function extractTextFromDocument(file: File): Promise<{ text: string; isTable?: boolean }> {
  const fileName = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 1. Word Documents (.docx)
  if (fileName.endsWith('.docx')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value || '' };
    } catch (e) {
      console.warn('Mammoth extraction failed, falling back:', e);
    }
  }

  // 2. Excel Spreadsheets (.xlsx, .xls)
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) {
        const worksheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        return { text: csv, isTable: true };
      }
    } catch (e) {
      console.warn('XLSX extraction failed:', e);
    }
  }

  // 3. CSV Tables
  if (fileName.endsWith('.csv')) {
    const text = buffer.toString('utf-8');
    return { text, isTable: true };
  }

  // 4. HTML Documents
  if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    const rawHtml = buffer.toString('utf-8');
    const cleanText = rawHtml
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { text: cleanText };
  }

  // 5. Plain Text (.txt, .rtf, .md, .log, etc.)
  const text = buffer.toString('utf-8');
  return { text };
}

/**
 * Converts text into formatted PDF pages with clean Helvetica typography and auto pagination.
 */
export async function convertTextToPdf(
  text: string,
  options: { title?: string; fontSize?: number; pageSize?: 'A4' | 'LETTER' } = {}
): Promise<Uint8Array> {
  const safeText = sanitizeWinAnsiText(text);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = options.fontSize || 11;
  const lineHeight = fontSize * 1.45;
  const margin = 50;

  const pageSize = options.pageSize === 'LETTER' ? PageSizes.Letter : PageSizes.A4;
  const [pageWidth, pageHeight] = pageSize;
  const usableWidth = pageWidth - margin * 2;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  if (options.title) {
    const safeTitle = sanitizeWinAnsiText(options.title);
    currentPage.drawText(safeTitle, {
      x: margin,
      y: currentY - 18,
      size: 16,
      font: titleFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 35;
  }

  const paragraphs = safeText.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      currentY -= lineHeight;
      if (currentY < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }
      continue;
    }

    // Word wrapping
    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth > usableWidth && currentLine) {
        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        currentY -= lineHeight;

        if (currentY < margin + lineHeight) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }

        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      currentPage.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      currentY -= lineHeight;

      if (currentY < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Converts CSV data string into a formatted PDF table document
 */
export async function convertCsvToPdf(csvContent: string): Promise<Uint8Array> {
  const safeContent = sanitizeWinAnsiText(csvContent);
  const rows = safeContent
    .split('\n')
    .map((r) => r.split(',').map((c) => c.trim().replace(/^["']|["']$/g, '')))
    .filter((r) => r.some((c) => c.length > 0));

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const [pageWidth, pageHeight] = PageSizes.A4;
  const margin = 40;
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const colCount = Math.max(...rows.map((r) => r.length), 1);
  const colWidth = (pageWidth - margin * 2) / colCount;
  const rowHeight = 22;

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const isHeader = rIdx === 0;
    const currentFont = isHeader ? boldFont : font;

    if (currentY - rowHeight < margin) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
    }

    // Row background for header
    if (isHeader) {
      currentPage.drawRectangle({
        x: margin,
        y: currentY - rowHeight + 4,
        width: pageWidth - margin * 2,
        height: rowHeight,
        color: rgb(0.92, 0.94, 0.98),
      });
    }

    for (let cIdx = 0; cIdx < colCount; cIdx++) {
      const cellText = row[cIdx] || '';
      const cellX = margin + cIdx * colWidth + 6;
      const cellY = currentY - 12;

      const truncated = cellText.length > 25 ? cellText.substring(0, 22) + '...' : cellText;

      currentPage.drawText(truncated, {
        x: cellX,
        y: cellY,
        size: 9,
        font: currentFont,
        color: isHeader ? rgb(0.1, 0.2, 0.5) : rgb(0.2, 0.2, 0.2),
      });
    }

    currentY -= rowHeight;
  }

  return await pdfDoc.save();
}
