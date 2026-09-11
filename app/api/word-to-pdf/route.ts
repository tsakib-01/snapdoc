import { NextRequest, NextResponse } from 'next/server';
import { convertWordToPdf } from '@/services/wordToPdf';
import { convertWithRemoteApi } from '@/services/remoteConversionService';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'word2pdf-api-'));
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No Word (.docx/.doc) file provided.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum size limit (50MB).' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const ext = path.extname(file.name).toLowerCase() || '.docx';
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    // 1. High-Fidelity Local Engine (Native LibreOffice / Word COM / Multilingual Python)
    try {
      const inputPath = path.join(tmpDir, `${baseName}${ext}`);
      await fs.writeFile(inputPath, fileBuffer);

      const outputPath = await convertWordToPdf({
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
        engine: 'Local High-Fidelity Office Engine',
      });
    } catch (localErr: any) {
      console.warn('Local Word to PDF conversion failed or not available, falling back to remote API:', localErr.message);
    }

    // 2. Remote Python FastAPI Backend Fallback (e.g., hosted on Render/Railway)
    const remoteRes = await convertWithRemoteApi('word-to-pdf', fileBuffer, file.name);
    if (remoteRes) {
      const base64Data = `data:${remoteRes.mimeType};base64,${remoteRes.buffer.toString('base64')}`;
      return NextResponse.json({
        success: true,
        filename: remoteRes.filename,
        size: remoteRes.buffer.length,
        mimeType: remoteRes.mimeType,
        dataUrl: base64Data,
        engine: 'Remote Python FastAPI',
      });
    }
  } catch (err: any) {
    console.error('Word to PDF conversion error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to convert Word document to PDF.' },
      { status: 500 }
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
