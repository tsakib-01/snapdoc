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
 * Extracts structured data or HTML from Word (.docx), Excel (.xlsx, .xls), CSV, HTML, and TXT files.
 */
export async function extractTextFromDocument(file: File): Promise<{ text: string; isTable?: boolean; buffer?: Buffer }> {
  const fileName = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 1. Word Documents (.docx)
  if (fileName.endsWith('.docx')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value || '', buffer };
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
        return { text: csv, isTable: true, buffer };
      }
    } catch (e) {
      console.warn('XLSX extraction failed:', e);
    }
  }

  // 3. CSV Tables
  if (fileName.endsWith('.csv')) {
    const text = buffer.toString('utf-8');
    return { text, isTable: true, buffer };
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
    return { text: cleanText, buffer };
  }

  // 5. Plain Text (.txt, .rtf, .md, .log, etc.)
  const text = buffer.toString('utf-8');
  return { text, buffer };
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
  const lineHeight = fontSize * 1.42;
  const margin = 50;

  const pageSize = options.pageSize === 'LETTER' ? PageSizes.Letter : PageSizes.A4;
  const [pageWidth, pageHeight] = pageSize;
  const usableWidth = pageWidth - margin * 2;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin - fontSize;

  if (options.title) {
    const safeTitle = sanitizeWinAnsiText(options.title);
    currentPage.drawText(safeTitle, {
      x: margin,
      y: currentY,
      size: 16,
      font: titleFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 28;
  }

  const paragraphs = safeText.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      currentY -= lineHeight;
      if (currentY < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin - fontSize;
      }
      continue;
    }

    // Preserve leading whitespace
    const leadingSpacesMatch = para.match(/^ +/);
    const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[0] : '';
    const trimmedPara = para.slice(leadingSpaces.length);

    // Word wrapping
    const words = trimmedPara.split(' ');
    let currentLine = leadingSpaces;

    for (const word of words) {
      const testLine = currentLine.trim() ? `${currentLine} ${word}` : `${currentLine}${word}`;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth > usableWidth && currentLine.trim()) {
        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0.12, 0.12, 0.12),
        });
        currentY -= lineHeight;

        if (currentY < margin + lineHeight) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin - fontSize;
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
        color: rgb(0.12, 0.12, 0.12),
      });
      currentY -= lineHeight;

      if (currentY < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin - fontSize;
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Converts Excel buffer or CSV content into a high-fidelity PDF table with dynamic column sizing,
 * landscape auto-orientation for wide tables, and alternating row styling.
 */
export async function convertExcelToPdf(bufferOrCsv: Buffer | string): Promise<Uint8Array> {
  let rows: (string | number)[][] = [];

  if (typeof bufferOrCsv === 'string') {
    const safeContent = sanitizeWinAnsiText(bufferOrCsv);
    rows = safeContent
      .split('\n')
      .map((r) => r.split(',').map((c) => c.trim().replace(/^["']|["']$/g, '')))
      .filter((r) => r.some((c) => String(c).length > 0));
  } else {
    try {
      const workbook = XLSX.read(bufferOrCsv, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) {
        const worksheet = workbook.Sheets[firstSheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as (string | number)[][];
      }
    } catch {
      const text = bufferOrCsv.toString('utf-8');
      return convertExcelToPdf(text);
    }
  }

  if (rows.length === 0) {
    rows = [['No data found in spreadsheet']];
  }

  const colCount = Math.max(...rows.map((r) => r.length), 1);
  const isWide = colCount > 5;

  // Use Landscape for wide tables (> 5 columns)
  const pageSize = isWide ? [PageSizes.A4[1], PageSizes.A4[0]] : PageSizes.A4;
  const [pageWidth, pageHeight] = pageSize;
  const margin = 35;
  const usableWidth = pageWidth - margin * 2;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const colWidth = usableWidth / colCount;
  const rowHeight = 22;

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const isHeader = rIdx === 0;
    const currentFont = isHeader ? boldFont : font;

    if (currentY - rowHeight < margin) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
    }

    // Header and alternating row backgrounds
    if (isHeader) {
      currentPage.drawRectangle({
        x: margin,
        y: currentY - rowHeight + 4,
        width: usableWidth,
        height: rowHeight,
        color: rgb(0.18, 0.35, 0.75), // Deep navy header
      });
    } else if (rIdx % 2 === 1) {
      currentPage.drawRectangle({
        x: margin,
        y: currentY - rowHeight + 4,
        width: usableWidth,
        height: rowHeight,
        color: rgb(0.96, 0.97, 0.99), // Subtle zebra striping
      });
    }

    // Draw horizontal grid line
    currentPage.drawLine({
      start: { x: margin, y: currentY - rowHeight + 4 },
      end: { x: margin + usableWidth, y: currentY - rowHeight + 4 },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.92),
    });

    for (let cIdx = 0; cIdx < colCount; cIdx++) {
      const cellVal = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : '';
      const safeText = sanitizeWinAnsiText(cellVal);
      const cellX = margin + cIdx * colWidth + 6;
      const cellY = currentY - 12;

      const maxChars = Math.max(8, Math.floor(colWidth / 6.5));
      const truncated = safeText.length > maxChars ? safeText.substring(0, maxChars - 2) + '...' : safeText;

      currentPage.drawText(truncated, {
        x: cellX,
        y: cellY,
        size: isWide ? 8 : 9,
        font: currentFont,
        color: isHeader ? rgb(1, 1, 1) : rgb(0.15, 0.15, 0.15),
      });
    }

    currentY -= rowHeight;
  }

  return await pdfDoc.save();
}

/**
 * Backward compatible CSV to PDF converter
 */
export async function convertCsvToPdf(csvContent: string): Promise<Uint8Array> {
  return convertExcelToPdf(csvContent);
}

