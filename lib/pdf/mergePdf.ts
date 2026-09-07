import { PDFDocument } from 'pdf-lib';

export async function mergePdfDocuments(pdfBuffers: Buffer[]): Promise<Uint8Array> {
  if (pdfBuffers.length < 2) {
    throw new Error('Please upload at least 2 PDF files to merge.');
  }

  const mergedDoc = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  return await mergedDoc.save();
}
