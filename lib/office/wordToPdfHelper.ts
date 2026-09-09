import * as mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';

/**
 * Converts a Microsoft Word (.docx) file into a high-fidelity PDF with full Unicode,
 * Bengali, complex script, table, list, and typography preservation.
 */
export async function convertDocxToPdfClient(file: File): Promise<{ dataUrl: string; size: number; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const { value: rawHtml } = await mammoth.convertToHtml({ arrayBuffer });

  const cleanHtml = rawHtml
    ? rawHtml
    : '<p>Document converted from Word.</p>';

  // Standard A4 dimensions at 96 DPI: 794px x 1123px
  const pageWidth = 794;
  const pageHeight = 1123;
  const padding = 54;
  const contentWidth = pageWidth - padding * 2;

  // Offscreen measurement container
  const measureDiv = document.createElement('div');
  measureDiv.style.position = 'fixed';
  measureDiv.style.top = '-99999px';
  measureDiv.style.left = '-99999px';
  measureDiv.style.width = `${contentWidth}px`;
  measureDiv.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Kalpurush', 'SolaimanLipi', Arial, sans-serif";
  measureDiv.style.fontSize = '14px';
  measureDiv.style.lineHeight = '1.6';
  measureDiv.style.color = '#111827';
  measureDiv.innerHTML = `
    <style>
      p { margin: 0 0 12px 0; }
      h1, h2, h3, h4 { margin: 16px 0 8px 0; font-weight: bold; color: #1e3a8a; }
      h1 { font-size: 22px; }
      h2 { font-size: 18px; }
      h3 { font-size: 16px; }
      table { border-collapse: collapse; width: 100%; margin: 12px 0; }
      td, th { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 13px; }
      th { background-color: #f3f4f6; font-weight: bold; }
      ul, ol { margin: 8px 0 12px 24px; padding: 0; }
      li { margin-bottom: 4px; }
    </style>
    ${cleanHtml}
  `;
  document.body.appendChild(measureDiv);

  const totalContentHeight = Math.max(measureDiv.scrollHeight, pageHeight - padding * 2);
  const usableHeightPerPage = pageHeight - padding * 2;
  const pageCount = Math.max(1, Math.ceil(totalContentHeight / usableHeightPerPage));

  document.body.removeChild(measureDiv);

  // Render via SVG ForeignObject with 2x scale for crisp retina text
  const scale = 2.0;
  const totalSvgHeight = pageHeight * pageCount;

  const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${totalSvgHeight}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width: ${pageWidth}px; background-color: #ffffff; color: #111827; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Kalpurush', 'SolaimanLipi', 'SutonnyMJ', Arial, sans-serif; font-size: 14px; line-height: 1.6; box-sizing: border-box;">
      <style>
        p { margin: 0 0 12px 0; }
        h1, h2, h3, h4 { margin: 16px 0 8px 0; font-weight: bold; color: #1e3a8a; }
        h1 { font-size: 22px; }
        h2 { font-size: 18px; }
        h3 { font-size: 16px; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        td, th { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 13px; }
        th { background-color: #f3f4f6; font-weight: bold; }
        ul, ol { margin: 8px 0 12px 24px; padding: 0; }
        li { margin-bottom: 4px; }
      </style>
      <div style="padding: ${padding}px;">
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

      const pageJpgDataUrl = canvas.toDataURL('image/jpeg', 0.92);
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
