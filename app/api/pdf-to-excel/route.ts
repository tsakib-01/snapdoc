import { NextRequest, NextResponse } from 'next/server';
import { convertPdfToExcelBuffer } from '@/lib/office/pdfLayoutExtractor';
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

    const xlsxBuffer = await convertPdfToExcelBuffer(pdfBuffer);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
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
  }
}
