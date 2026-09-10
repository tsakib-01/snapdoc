import { NextRequest, NextResponse } from 'next/server';
import { convertPdfToExcel } from '@/services/pdfToExcel';
import { convertWithRemoteApi } from '@/services/remoteConversionService';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf2excel-api-'));
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum size limit (50MB).' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    // 1. Check if remote Python FastAPI backend is configured
    try {
      const remoteRes = await convertWithRemoteApi('pdf-to-excel', pdfBuffer, file.name);
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
    const inputPath = path.join(tmpDir, `${baseName}.pdf`);
    await fs.writeFile(inputPath, pdfBuffer);

    const outputPath = await convertPdfToExcel({
      inputPath,
      outputDir: tmpDir,
    });

    const xlsxBuffer = await fs.readFile(outputPath);
    const base64Data = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${xlsxBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: `${baseName}.xlsx`,
      size: xlsxBuffer.length,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('PDF to Excel conversion error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to convert PDF to Excel spreadsheet.' },
      { status: 500 }
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
