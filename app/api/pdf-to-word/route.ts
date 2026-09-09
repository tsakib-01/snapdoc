import { NextRequest, NextResponse } from 'next/server';
import { convertPdfToWordBuffer } from '@/lib/office/pdfLayoutExtractor';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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

    const docxBuffer = await convertPdfToWordBuffer(pdfBuffer, baseName);
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
  }
}
