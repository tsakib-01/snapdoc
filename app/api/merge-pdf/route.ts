import { NextRequest, NextResponse } from 'next/server';
import { mergePdfDocuments } from '@/lib/pdf/mergePdf';
import { PDFDocument } from 'pdf-lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length < 2) {
      return NextResponse.json({ error: 'Please upload at least 2 PDF files to merge.' }, { status: 400 });
    }

    const buffers: Buffer[] = [];
    let originalTotalSize = 0;
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      buffers.push(buf);
      originalTotalSize += file.size;
    }

    const mergedBytes = await mergePdfDocuments(buffers);
    const resultDoc = await PDFDocument.load(mergedBytes);
    const pageCount = resultDoc.getPageCount();

    const base64Data = `data:application/pdf;base64,${Buffer.from(mergedBytes).toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: 'merged_document.pdf',
      pageCount,
      originalSize: originalTotalSize,
      fileSize: mergedBytes.length,
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Merge PDF error:', err);
    return NextResponse.json(
      { error: 'Failed to merge PDF files. Please ensure the files are valid and not password-protected.' },
      { status: 500 }
    );
  }
}
