import * as mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';

/**
 * Converts a Microsoft Word (.docx) file into a high-fidelity PDF with full image extraction
 * (logos, graphics), table column preservation, centered layouts, and sharp retina rendering.
 */
export async function convertDocxToPdfClient(file: File): Promise<{ dataUrl: string; size: number; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();

  // Extract HTML with embedded base64 images
  const mammothOptions = {
    convertImage: (mammoth.images as any).imgElement((image: any) => {
      return image.read('base64').then((imageBuffer: string) => {
        return {
          src: `data:${image.contentType};base64,${imageBuffer}`,
        };
      });
    }),
  };

  const { value: rawHtml } = await (mammoth as any).convertToHtml({ arrayBuffer }, mammothOptions);

  const cleanHtml = rawHtml && rawHtml.trim().length > 0
    ? rawHtml
    : '<p>Document converted from Word.</p>';

  // Standard A4 dimensions at 96 DPI: 794px x 1123px
  const pageWidth = 794;
  const pageHeight = 1123;
  const paddingX = 54;
  const paddingY = 48;
  const contentWidth = pageWidth - paddingX * 2;

  // Offscreen measurement container
  const measureDiv = document.createElement('div');
  measureDiv.style.position = 'fixed';
  measureDiv.style.top = '-99999px';
  measureDiv.style.left = '-99999px';
  measureDiv.style.width = `${contentWidth}px`;
  measureDiv.style.fontFamily = "'Times New Roman', 'Nimbus Roman No9 L', 'Liberation Serif', 'Kalpurush', 'SolaimanLipi', Cambria, Georgia, serif";
  measureDiv.style.fontSize = '15px';
  measureDiv.style.lineHeight = '1.5';
  measureDiv.style.color = '#111827';
  measureDiv.innerHTML = `
    <style>
      p { margin: 0 0 10px 0; }
      h1, h2, h3, h4 { margin: 16px 0 8px 0; font-weight: bold; color: #111827; text-align: center; }
      h1 { font-size: 20px; }
      h2 { font-size: 17px; }
      h3 { font-size: 15px; }
      img { max-width: 180px; max-height: 180px; height: auto; display: block; margin: 18px auto; object-fit: contain; }
      table { border-collapse: collapse; width: 100%; margin: 12px 0; }
      td, th { padding: 4px 12px; vertical-align: top; border: none; }
      ul, ol { margin: 8px 0 12px 24px; padding: 0; }
      li { margin-bottom: 4px; }
    </style>
    ${cleanHtml}
  `;
  document.body.appendChild(measureDiv);

  const totalContentHeight = Math.max(measureDiv.scrollHeight, pageHeight - paddingY * 2);
  const usableHeightPerPage = pageHeight - paddingY * 2;
  const pageCount = Math.max(1, Math.ceil(totalContentHeight / usableHeightPerPage));

  document.body.removeChild(measureDiv);

  // Render via SVG ForeignObject with 2.5x scale for ultra-sharp typography
  const scale = 2.5;
  const totalSvgHeight = pageHeight * pageCount;

  const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${totalSvgHeight}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width: ${pageWidth}px; background-color: #ffffff; color: #111827; font-family: 'Times New Roman', 'Nimbus Roman No9 L', 'Liberation Serif', 'Kalpurush', 'SolaimanLipi', Cambria, Georgia, serif; font-size: 15px; line-height: 1.5; box-sizing: border-box;">
      <style>
        p { margin: 0 0 10px 0; }
        h1, h2, h3, h4 { margin: 16px 0 8px 0; font-weight: bold; color: #111827; text-align: center; }
        h1 { font-size: 20px; }
        h2 { font-size: 17px; }
        h3 { font-size: 15px; }
        img { max-width: 180px; max-height: 180px; height: auto; display: block; margin: 18px auto; object-fit: contain; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        td, th { padding: 4px 12px; vertical-align: top; border: none; }
        ul, ol { margin: 8px 0 12px 24px; padding: 0; }
        li { margin-bottom: 4px; }
      </style>
      <div style="padding: ${paddingY}px ${paddingX}px;">
        ${cleanHtml}
      </div>
    </div>
  </foreignObject>
</svg>`;

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to render Word document HTML to SVG image.'));
    img.src = url;
  });

  const pdfDoc = await PDFDocument.create();

  // Draw each A4 slice onto canvas and embed as page in PDF
  for (let p = 0; p < pageCount; p++) {
    const canvas = document.createElement('canvas');
    canvas.width = pageWidth * scale;
    canvas.height = pageHeight * scale;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Source slice from full rendered image
      const srcY = p * pageHeight;
      ctx.drawImage(
        img,
        0, srcY, pageWidth, pageHeight,
        0, 0, canvas.width, canvas.height
      );

      const pageJpgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const base64Data = pageJpgDataUrl.split(',')[1];
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      const embeddedJpg = await pdfDoc.embedJpg(imageBytes);
      // Standard A4 PDF size in points: 595.28 x 841.89
      const pdfPage = pdfDoc.addPage([595.28, 841.89]);
      pdfPage.drawImage(embeddedJpg, {
        x: 0,
        y: 0,
        width: 595.28,
        height: 841.89,
      });
    }
  }

  URL.revokeObjectURL(url);

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const base64Pdf = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;

  return {
    dataUrl: base64Pdf,
    size: pdfBytes.length,
    pageCount,
  };
}
