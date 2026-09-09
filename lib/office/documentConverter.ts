import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';

export async function convertTextToPdf(
  text: string,
  options: { title?: string; fontSize?: number; pageSize?: 'A4' | 'LETTER' } = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = options.fontSize || 11;
  const lineHeight = fontSize * 1.4;
  const margin = 50;

  const pageSize = options.pageSize === 'LETTER' ? PageSizes.Letter : PageSizes.A4;
  const [pageWidth, pageHeight] = pageSize;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  if (options.title) {
    currentPage.drawText(options.title, {
      x: margin,
      y: currentY - 18,
      size: 18,
      font: titleFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 35;
  }

  const paragraphs = text.split(/\r?\n/);

  for (const para of paragraphs) {
    if (!para.trim()) {
      currentY -= lineHeight;
      if (currentY < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }
      continue;
    }

    // Word wrap
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
  const rows = csvContent
    .split(/\r?\n/)
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
