import { NextRequest, NextResponse } from 'next/server';
import { organizePdfDocument } from '@/lib/pdf/organizePdf';
import { MAX_PDF_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const filesList = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;
    const allFiles = filesList.length > 0 ? filesList : (singleFile ? [singleFile] : []);
    const pagesJson = formData.get('pages') as string;
    const separateFiles = formData.get('separateFiles') === 'true';

    if (allFiles.length === 0) {
      return NextResponse.json({ error: 'No PDF file uploaded.' }, { status: 400 });
    }

    for (const f of allFiles) {
      if (f.size > MAX_PDF_FILE_SIZE) {
        return NextResponse.json({ error: `File "${f.name}" exceeds maximum 50MB size limit.` }, { status: 400 });
      }
    }

    let pages: { fileIndex?: number; pageIndex: number; rotation?: number; isBlank?: boolean }[] = [];
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

    const inputBuffers = await Promise.all(
      allFiles.map(async (f) => Buffer.from(await f.arrayBuffer()))
    );
    const baseName = allFiles[0].name.replace(/\.[^/.]+$/, '');

    const result = await organizePdfDocument(inputBuffers, {
      pages,
      separateFiles,
      baseName,
    });

    const base64Data = `data:${result.mimeType};base64,${Buffer.from(result.data).toString('base64')}`;

    return NextResponse.json({
      success: true,
      originalName: allFiles[0].name,
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
