import { NextRequest, NextResponse } from 'next/server';
import { convertExcelToPdf } from '@/services/excelToPdf';
import { convertWithRemoteApi } from '@/services/remoteConversionService';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';
import { PDFDocument, degrees } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validates that every page in the PDF is in Landscape orientation.
 * If any page is Portrait, rotates it 90 degrees to ensure all wide columns are visible.
 */
async function ensurePdfIsLandscape(buffer: Buffer): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    let modified = false;
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      const rot = page.getRotation().angle;
      const isRotated90 = rot === 90 || rot === 270;
      const effW = isRotated90 ? height : width;
      const effH = isRotated90 ? width : height;
      if (effW < effH) {
        page.setRotation(degrees((rot + 90) % 360));
        modified = true;
      }
    }
    if (modified) {
      const savedBytes = await pdfDoc.save();
      return Buffer.from(savedBytes);
    }
  } catch (e) {
    console.warn('ensurePdfIsLandscape warning:', e);
  }
  return buffer;
}

export async function POST(req: NextRequest) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'excel2pdf-api-'));
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No Excel (.xlsx/.xls/.csv) file provided.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum size limit (50MB).' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const ext = path.extname(file.name).toLowerCase() || '.xlsx';
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    // 1. Local High-Fidelity Spreadsheet Engine (Excel COM / LibreOffice Landscape / ReportLab)
    try {
      const inputPath = path.join(tmpDir, `${baseName}${ext}`);
      await fs.writeFile(inputPath, fileBuffer);

      const outputPath = await convertExcelToPdf({
        inputPath,
        outputDir: tmpDir,
      });

      const rawPdfBuffer = await fs.readFile(outputPath);
      const landscapePdfBuffer = await ensurePdfIsLandscape(rawPdfBuffer);
      const base64Data = `data:application/pdf;base64,${landscapePdfBuffer.toString('base64')}`;

      return NextResponse.json({
        success: true,
        filename: `${baseName}.pdf`,
        size: landscapePdfBuffer.length,
        mimeType: 'application/pdf',
        dataUrl: base64Data,
        engine: 'Local High-Fidelity Office Engine (Landscape)',
      });
    } catch (localErr: any) {
      console.warn('Local Excel to PDF conversion failed, trying remote API:', localErr.message);
    }

    // 2. Remote Python FastAPI Backend Fallback
    try {
      const remoteRes = await convertWithRemoteApi('excel-to-pdf', fileBuffer, file.name);
      if (remoteRes) {
        const landscapePdfBuffer = await ensurePdfIsLandscape(remoteRes.buffer);
        const base64Data = `data:${remoteRes.mimeType};base64,${landscapePdfBuffer.toString('base64')}`;
        return NextResponse.json({
          success: true,
          filename: remoteRes.filename,
          size: landscapePdfBuffer.length,
          mimeType: remoteRes.mimeType,
          dataUrl: base64Data,
          engine: 'Remote Python FastAPI Backend (Landscape)',
        });
      }
    } catch (remoteErr: any) {
      console.warn('Remote Python API conversion failed:', remoteErr.message);
    }

    throw new Error('All Excel to PDF conversion engines failed.');
  } catch (err: any) {
    console.error('Excel to PDF conversion error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to convert Excel spreadsheet to PDF.' },
      { status: 500 }
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
