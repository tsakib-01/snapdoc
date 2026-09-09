import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';

export interface PageActionConfig {
  pageIndex: number; // 0-indexed original page
  rotation?: number; // 0, 90, 180, 270
}

export interface OrganizePdfOptions {
  pages: PageActionConfig[]; // pages to include in the output in desired order
  separateFiles?: boolean; // if true, returns a ZIP of individual PDFs
  baseName?: string;
}

export async function organizePdfDocument(
  pdfBuffer: Buffer,
  options: OrganizePdfOptions
): Promise<{
  data: Uint8Array;
  mimeType: string;
  filename: string;
  pageCount: number;
}> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const baseName = options.baseName || 'organized_document';

  if (options.pages.length === 0) {
    throw new Error('Please select at least one page to process.');
  }

  if (options.separateFiles) {
    // Generate a ZIP containing each extracted page
    const zip = new JSZip();

    for (let i = 0; i < options.pages.length; i++) {
      const { pageIndex, rotation } = options.pages[i];
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(srcDoc, [pageIndex]);

      if (rotation && rotation !== 0) {
        const currentRot = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentRot + rotation) % 360));
      }

      singleDoc.addPage(copiedPage);
      const pageBytes = await singleDoc.save();
      zip.file(`${baseName}_page_${i + 1}.pdf`, pageBytes);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return {
      data: zipBuffer,
      mimeType: 'application/zip',
      filename: `${baseName}_pages.zip`,
      pageCount: options.pages.length,
    };
  }

  // Combine selected pages into a single new PDF document
  const outDoc = await PDFDocument.create();

  for (let i = 0; i < options.pages.length; i++) {
    const { pageIndex, rotation } = options.pages[i];
    const [copiedPage] = await outDoc.copyPages(srcDoc, [pageIndex]);

    if (rotation && rotation !== 0) {
      const currentRot = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRot + rotation) % 360));
    }

    outDoc.addPage(copiedPage);
  }

  const outBytes = await outDoc.save();
  return {
    data: outBytes,
    mimeType: 'application/pdf',
    filename: `${baseName}.pdf`,
    pageCount: options.pages.length,
  };
}
