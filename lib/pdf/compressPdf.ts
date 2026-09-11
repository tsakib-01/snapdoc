import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { convertWithRemoteApi } from '@/services/remoteConversionService';

const execFileAsync = promisify(execFile);

export interface CompressPdfResult {
  data: Uint8Array;
  originalSize: number;
  newSize: number;
  reductionPercentage: number;
  pageCount: number;
  isAlreadyMaxCompressed: boolean;
}

export async function compressPdfDocument(
  pdfBuffer: Buffer,
  level: 'recommended' | 'extreme' | 'lossless' = 'recommended'
): Promise<CompressPdfResult> {
  const originalSize = pdfBuffer.length;
  let compressedBytes: Uint8Array | null = null;
  let pageCount = 1;

  // 1. Attempt local Python PyMuPDF + Pillow compression engine (highest efficiency, same as professional sites)
  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-compress-'));
    const inputPath = path.join(tempDir, 'input.pdf');
    const outputPath = path.join(tempDir, 'compressed.pdf');
    const scriptPath = path.join(process.cwd(), 'scripts', 'convert_engine.py');

    await fs.writeFile(inputPath, pdfBuffer);

    await execFileAsync(
      'python',
      [scriptPath, 'compress-pdf', inputPath, outputPath, '--level', level],
      { timeout: 35000 }
    );

    const outBuf = await fs.readFile(outputPath);
    if (outBuf && outBuf.length > 0) {
      compressedBytes = new Uint8Array(outBuf);
    }

    // Clean up temp files
    try {
      await fs.unlink(inputPath);
      await fs.unlink(outputPath);
      await fs.rmdir(tempDir);
    } catch (_) {}
  } catch (pyErr: any) {
    console.warn('Local Python PDF compressor skipped/failed, trying remote microservice:', pyErr?.message);
  }

  // 2. Attempt remote Python microservice if local python was unavailable or didn't compress
  if (!compressedBytes || compressedBytes.length >= originalSize) {
    try {
      const remoteRes = await convertWithRemoteApi(
        'compress-pdf',
        pdfBuffer,
        'document.pdf',
        { level }
      );
      if (remoteRes && remoteRes.buffer && remoteRes.buffer.length > 0) {
        if (remoteRes.buffer.length < (compressedBytes?.length || originalSize)) {
          compressedBytes = new Uint8Array(remoteRes.buffer);
        }
      }
    } catch (remoteErr: any) {
      console.warn('Remote microservice PDF compressor notice:', remoteErr?.message);
    }
  }

  // 3. Fallback to pdf-lib stream & object cleanup if python was unavailable
  if (!compressedBytes) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
        updateMetadata: false,
      });
      pageCount = pdfDoc.getPageCount();

      try {
        compressedBytes = await pdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
          objectsPerTick: 50,
        });
      } catch {
        compressedBytes = await pdfDoc.save({
          useObjectStreams: false,
          addDefaultPage: false,
        });
      }
    } catch (fallbackErr) {
      console.warn('pdf-lib fallback skipped:', fallbackErr);
      compressedBytes = new Uint8Array(pdfBuffer);
    }
  }

  // Determine final page count if not already obtained
  try {
    const docForCount = await PDFDocument.load(compressedBytes || pdfBuffer, {
      ignoreEncryption: true,
    });
    pageCount = docForCount.getPageCount();
  } catch (_) {}

  // Strict safety rule: If compression makes it larger or equal (or insignificant saving <= 32 bytes), keep original untouched
  const bestSize = compressedBytes ? compressedBytes.length : originalSize;
  const isAlreadyMaxCompressed = bestSize >= originalSize - 32;

  const finalData = isAlreadyMaxCompressed ? new Uint8Array(pdfBuffer) : compressedBytes!;
  const finalSize = isAlreadyMaxCompressed ? originalSize : bestSize;
  const reductionPercentage = isAlreadyMaxCompressed || originalSize === 0
    ? 0
    : parseFloat((((originalSize - finalSize) / originalSize) * 100).toFixed(1));

  return {
    data: finalData,
    originalSize,
    newSize: finalSize,
    reductionPercentage,
    pageCount,
    isAlreadyMaxCompressed,
  };
}


