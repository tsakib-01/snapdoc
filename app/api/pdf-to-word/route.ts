import { NextRequest, NextResponse } from 'next/server';
import { convertPdfToWord } from '@/services/pdfToWord';
import { convertWithRemoteApi } from '@/services/remoteConversionService';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf2word-api-'));
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
      const remoteRes = await convertWithRemoteApi('pdf-to-word', pdfBuffer, file.name);
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

    const outputPath = await convertPdfToWord({
      inputPath,
      outputDir: tmpDir,
    });

    const docxBuffer = await fs.readFile(outputPath);
    const base64Data = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: `${baseName}.docx`,
      size: docxBuffer.length,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('PDF to Word conversion error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to convert PDF to Word document.' },
      { status: 500 }
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
