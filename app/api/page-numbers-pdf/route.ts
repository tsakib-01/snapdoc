import { NextRequest, NextResponse } from 'next/server';
import { addPageNumbersToPdf } from '@/lib/pdf/pageNumberer';
import { MAX_PDF_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const position = (formData.get('position') as any) || 'bottom-center';
    const format = (formData.get('format') as any) || 'page-n-of-total';
    const startPage = parseInt(formData.get('startPage') as string, 10) || 1;
    const startNumber = parseInt(formData.get('startNumber') as string, 10) || 1;
    const fontSize = parseInt(formData.get('fontSize') as string, 10) || 10;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_PDF_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum 50MB size limit.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const numberedBytes = await addPageNumbersToPdf(inputBuffer, {
      position,
      format,
      startPage,
      startNumber,
      fontSize,
    });

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const base64Data = `data:application/pdf;base64,${Buffer.from(numberedBytes).toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: `${baseName}_numbered.pdf`,
      size: numberedBytes.length,
      mimeType: 'application/pdf',
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Page numbers error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to add page numbers to PDF.' },
      { status: 500 }
    );
  }
}
