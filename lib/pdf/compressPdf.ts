import { PDFDocument } from 'pdf-lib';

export interface CompressPdfResult {
  data: Uint8Array;
  originalSize: number;
  newSize: number;
  reductionPercentage: number;
  pageCount: number;
}

export async function compressPdfDocument(pdfBuffer: Buffer): Promise<CompressPdfResult> {
  const originalSize = pdfBuffer.length;

  // Load and clean document structure
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  const pageCount = pdfDoc.getPageCount();

  // Save with maximum object stream compression and removal of unused objects
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  const newSize = compressedBytes.length;
  const reductionPercentage = originalSize > 0
    ? Math.max(0, parseFloat((((originalSize - newSize) / originalSize) * 100).toFixed(1)))
    : 0;

  return {
    data: compressedBytes,
    originalSize,
    newSize,
    reductionPercentage,
    pageCount,
  };
}
