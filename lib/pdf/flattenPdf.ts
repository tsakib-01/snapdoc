import { PDFDocument } from 'pdf-lib';

export async function flattenPdfDocument(pdfBuffer: Buffer): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  // Flatten interactive form fields if present
  try {
    const form = pdfDoc.getForm();
    form.flatten();
  } catch {
    // PDF might not have acroforms
  }

  return await pdfDoc.save();
}

export async function cropPdfDocument(
  pdfBuffer: Buffer,
  margins: { top: number; right: number; bottom: number; left: number }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const newX = Math.max(0, margins.left);
    const newY = Math.max(0, margins.bottom);
    const newWidth = Math.max(50, width - margins.left - margins.right);
    const newHeight = Math.max(50, height - margins.top - margins.bottom);

    page.setCropBox(newX, newY, newWidth, newHeight);
  }

  return await pdfDoc.save();
}
