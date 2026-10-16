import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';

export interface PageActionConfig {
  fileIndex?: number; // 0-indexed file index in input buffers array
  pageIndex: number; // 0-indexed original page
  rotation?: number; // 0, 90, 180, 270
  isBlank?: boolean; // if true, creates a blank page
}

export interface OrganizePdfOptions {
  pages: PageActionConfig[]; // pages to include in the output in desired order
  separateFiles?: boolean; // if true, returns a ZIP of individual PDFs
  baseName?: string;
}

export async function organizePdfDocument(
  pdfBuffers: Buffer | Buffer[],
  options: OrganizePdfOptions
): Promise<{
  data: Uint8Array;
  mimeType: string;
  filename: string;
  pageCount: number;
}> {
  const buffers = Array.isArray(pdfBuffers) ? pdfBuffers : [pdfBuffers];
  const srcDocs = await Promise.all(
    buffers.map((buf) => PDFDocument.load(buf, { ignoreEncryption: true }))
  );
  const baseName = options.baseName || 'organized_document';

  if (options.pages.length === 0) {
    throw new Error('Please select at least one page to process.');
  }

  if (options.separateFiles) {
    // Generate a ZIP containing each extracted page
    const zip = new JSZip();

    for (let i = 0; i < options.pages.length; i++) {
      const { fileIndex = 0, pageIndex, rotation, isBlank } = options.pages[i];
      const singleDoc = await PDFDocument.create();

      if (isBlank || fileIndex < 0 || pageIndex < 0) {
        singleDoc.addPage([595, 842]);
      } else {
        const srcDoc = srcDocs[fileIndex] || srcDocs[0];
        const [copiedPage] = await singleDoc.copyPages(srcDoc, [pageIndex]);

        if (rotation && rotation !== 0) {
          const currentRot = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((currentRot + rotation) % 360));
        }

        singleDoc.addPage(copiedPage);
      }

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
    const { fileIndex = 0, pageIndex, rotation, isBlank } = options.pages[i];

    if (isBlank || fileIndex < 0 || pageIndex < 0) {
      outDoc.addPage([595, 842]);
    } else {
      const srcDoc = srcDocs[fileIndex] || srcDocs[0];
      const [copiedPage] = await outDoc.copyPages(srcDoc, [pageIndex]);

      if (rotation && rotation !== 0) {
        const currentRot = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentRot + rotation) % 360));
      }

      outDoc.addPage(copiedPage);
    }
  }

  const outBytes = await outDoc.save();
  return {
    data: outBytes,
    mimeType: 'application/pdf',
    filename: `${baseName}.pdf`,
    pageCount: options.pages.length,
  };
}
