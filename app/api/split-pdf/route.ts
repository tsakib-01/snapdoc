import { NextRequest, NextResponse } from 'next/server';
import { splitPdfDocument } from '@/lib/pdf/splitPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const range = (formData.get('range') as string) || '';
    const extractAllSeparate = formData.get('extractAllSeparate') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded.' }, { status: 400 });
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await splitPdfDocument(buffer, {
      range,
      extractAllSeparate,
      baseName,
    });

    const isZip = result.mode === 'zip-individual';
    const mimeType = isZip ? 'application/zip' : 'application/pdf';
    const base64Data = `data:${mimeType};base64,${Buffer.from(result.data).toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: result.filename,
      mode: result.mode,
      pageCount: result.pageCount,
      fileSize: result.data.length,
      originalSize: file.size,
      mimeType,
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Split PDF error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to split PDF. Please check selected page ranges.' },
      { status: 500 }
    );
  }
}
