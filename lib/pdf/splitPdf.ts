import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export interface SplitPdfResult {
  mode: 'merged-range' | 'zip-individual';
  data: Uint8Array;
  filename: string;
  pageCount: number;
}

/**
 * Parses page range strings like "1-3, 5, 8-10" into 0-indexed page indices.
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const indices = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) {
        indices.add(i - 1);
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        indices.add(page - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

export async function splitPdfDocument(
  pdfBuffer: Buffer,
  options: {
    range?: string;
    extractAllSeparate?: boolean;
    baseName?: string;
  }
): Promise<SplitPdfResult> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const baseName = options.baseName || 'document';

  if (options.extractAllSeparate) {
    const zip = new JSZip();

    for (let i = 0; i < totalPages; i++) {
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
      singleDoc.addPage(copiedPage);
      const pageBytes = await singleDoc.save();
      zip.file(`${baseName}_page_${i + 1}.pdf`, pageBytes);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return {
      mode: 'zip-individual',
      data: zipBuffer,
      filename: `${baseName}_pages.zip`,
      pageCount: totalPages,
    };
  }

  // Extract selected pages into one PDF
  const selectedIndices = options.range
    ? parsePageRanges(options.range, totalPages)
    : srcDoc.getPageIndices();

  if (selectedIndices.length === 0) {
    throw new Error('No valid pages selected for splitting.');
  }

  const outputDoc = await PDFDocument.create();
  const copiedPages = await outputDoc.copyPages(srcDoc, selectedIndices);
  copiedPages.forEach((page) => outputDoc.addPage(page));

  const pdfBytes = await outputDoc.save();

  return {
    mode: 'merged-range',
    data: pdfBytes,
    filename: `${baseName}_split.pdf`,
    pageCount: selectedIndices.length,
  };
}
