import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface PageNumberOptions {
  position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
  format?: 'n' | 'page-n' | 'n-of-total' | 'page-n-of-total';
  startPage?: number; // default 1
  startNumber?: number; // default 1
  fontSize?: number; // default 10
  margin?: number; // default 25
  fontColor?: string; // hex string e.g. '#000000'
  backgroundColor?: string; // hex string e.g. '#ffffff' or 'transparent'
  textColor?: { r: number; g: number; b: number }; // backwards compatibility
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

export async function addPageNumbersToPdf(
  pdfBuffer: Buffer | Uint8Array | ArrayBuffer,
  options: PageNumberOptions = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const totalPages = pdfDoc.getPageCount();

  const position = options.position || 'bottom-center';
  const format = options.format || 'page-n-of-total';
  const startPage = Math.max(1, options.startPage || 1);
  const startNum = Math.max(1, options.startNumber || 1);
  const fontSize = options.fontSize || 10;
  const margin = options.margin || 25;

  let color = rgb(0.2, 0.2, 0.2);
  if (options.fontColor) {
    const parsed = hexToRgb(options.fontColor);
    color = rgb(parsed.r, parsed.g, parsed.b);
  } else if (options.textColor) {
    color = rgb(options.textColor.r, options.textColor.g, options.textColor.b);
  }

  const bgRgb =
    options.backgroundColor && options.backgroundColor !== 'transparent'
      ? hexToRgb(options.backgroundColor)
      : null;

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

    if (bgRgb) {
      const padX = 6;
      const padY = 3;
      page.drawRectangle({
        x: x - padX,
        y: y - fontSize * 0.25 - padY,
        width: textWidth + padX * 2,
        height: fontSize + padY * 2,
        color: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
      });
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
