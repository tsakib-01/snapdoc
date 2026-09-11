import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface PageNumberOptions {
  position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
  format?: 'n' | 'page-n' | 'n-of-total' | 'page-n-of-total';
  startPage?: number; // default 1
  startNumber?: number; // default 1
  fontSize?: number; // default 10
  margin?: number; // default 25
  textColor?: { r: number; g: number; b: number }; // default rgb(0.3, 0.3, 0.3)
}

export async function addPageNumbersToPdf(
  pdfBuffer: Buffer,
  options: PageNumberOptions = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const totalPages = pdfDoc.getPageCount();

  const position = options.position || 'bottom-center';
  const format = options.format || 'page-n-of-total';
  const startPage = Math.max(1, options.startPage || 1);
  const startNum = Math.max(1, options.startNumber || 1);
  const fontSize = options.fontSize || 10;
  const margin = options.margin || 25;
  const color = options.textColor
    ? rgb(options.textColor.r, options.textColor.g, options.textColor.b)
    : rgb(0.2, 0.2, 0.2);

  const pages = pdfDoc.getPages();

  for (let i = startPage - 1; i < totalPages; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const currentNumber = startNum + (i - (startPage - 1));

    let text = `${currentNumber}`;
    if (format === 'page-n') {
      text = `Page ${currentNumber}`;
    } else if (format === 'n-of-total') {
      text = `${currentNumber} of ${totalPages}`;
    } else if (format === 'page-n-of-total') {
      text = `Page ${currentNumber} of ${totalPages}`;
    }

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    let x = (width - textWidth) / 2; // default center
    let y = margin; // default bottom

    if (position.includes('left')) {
      x = margin;
    } else if (position.includes('right')) {
      x = width - textWidth - margin;
    } else {
      x = (width - textWidth) / 2;
    }

    if (position.includes('top')) {
      y = height - textHeight - margin;
    } else {
      y = margin;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color,
    });
  }

  return await pdfDoc.save();
}
