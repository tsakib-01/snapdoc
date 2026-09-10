import { NextRequest, NextResponse } from 'next/server';
import { convertExcelToPdf } from '@/services/excelToPdf';
import { convertWithRemoteApi } from '@/services/remoteConversionService';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // 1. Check if remote Python FastAPI backend is configured
    try {
      const remoteRes = await convertWithRemoteApi('excel-to-pdf', fileBuffer, file.name);
      if (remoteRes) {
        const base64Data = `data:${remoteRes.mimeType};base64,${remoteRes.buffer.toString('base64')}`;
        return NextResponse.json({
          success: true,
          filename: remoteRes.filename,
          size: remoteRes.buffer.length,
          mimeType: remoteRes.mimeType,
          dataUrl: base64Data,
        });
      }
    } catch (remoteErr: any) {
      console.warn('Remote Python API conversion failed, attempting local fallback:', remoteErr.message);
    }

    // 2. Local Python Engine
    const inputPath = path.join(tmpDir, `${baseName}${ext}`);
    await fs.writeFile(inputPath, fileBuffer);

    const outputPath = await convertExcelToPdf({
      inputPath,
      outputDir: tmpDir,
    });

    const pdfBuffer = await fs.readFile(outputPath);
    const base64Data = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: `${baseName}.pdf`,
      size: pdfBuffer.length,
      mimeType: 'application/pdf',
      dataUrl: base64Data,
    });
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
