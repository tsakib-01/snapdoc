import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import sharp from 'sharp';

export interface WatermarkOptions {
  type: 'text' | 'image';
  text?: string;
  imageBuffer?: Buffer;
  fontSize?: number;
  opacity?: number; // 0.1 to 1.0
  rotation?: number; // e.g. -45, 0, 45, 90
  color?: string; // hex #ff0000
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16) / 255,
      g: parseInt(clean.substring(2, 4), 16) / 255,
      b: parseInt(clean.substring(4, 6), 16) / 255,
    };
  }
  return { r: 0.5, g: 0.5, b: 0.5 };
}

export async function watermarkPdfDocument(
  pdfBuffer: Buffer,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const opacity = options.opacity ?? 0.3;
  const rotation = options.rotation ?? -45;

  if (options.type === 'image' && options.imageBuffer) {
    const pngBuffer = await sharp(options.imageBuffer).png().toBuffer();
    const embedImage = await pdfDoc.embedPng(pngBuffer);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const imgWidth = Math.min(width * 0.5, embedImage.width);
      const imgHeight = (imgWidth / embedImage.width) * embedImage.height;

      page.drawImage(embedImage, {
        x: (width - imgWidth) / 2,
        y: (height - imgHeight) / 2,
        width: imgWidth,
        height: imgHeight,
        opacity,
        rotate: degrees(rotation),
      });
    }
  } else {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const text = options.text || 'CONFIDENTIAL';
    const fontSize = options.fontSize || 48;
    const colorObj = options.color ? parseHexColor(options.color) : { r: 0.6, g: 0.6, b: 0.6 };

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: (height - textHeight) / 2,
        size: fontSize,
        font,
        color: rgb(colorObj.r, colorObj.g, colorObj.b),
        opacity,
        rotate: degrees(rotation),
      });
    }
  }

  return await pdfDoc.save();
}
