import { NextRequest, NextResponse } from 'next/server';
import { organizePdfDocument } from '@/lib/pdf/organizePdf';
import { MAX_PDF_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const pagesJson = formData.get('pages') as string;
    const separateFiles = formData.get('separateFiles') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_PDF_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum 50MB size limit.' }, { status: 400 });
    }

    let pages: { pageIndex: number; rotation?: number }[] = [];
    if (pagesJson) {
      try {
        pages = JSON.parse(pagesJson);
      } catch {
        return NextResponse.json({ error: 'Invalid pages payload format.' }, { status: 400 });
      }
    }

    if (!pages || pages.length === 0) {
      return NextResponse.json({ error: 'Please select at least one page to process.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    const result = await organizePdfDocument(inputBuffer, {
      pages,
      separateFiles,
      baseName,
    });

    const base64Data = `data:${result.mimeType};base64,${Buffer.from(result.data).toString('base64')}`;

    return NextResponse.json({
      success: true,
      originalName: file.name,
      filename: result.filename,
      mimeType: result.mimeType,
      size: result.data.length,
      pageCount: result.pageCount,
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Organize PDF error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process and organize PDF pages.' },
      { status: 500 }
    );
  }
}
