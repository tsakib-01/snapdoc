import { NextRequest, NextResponse } from 'next/server';
import { compressPdfDocument } from '@/lib/pdf/compressPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await compressPdfDocument(buffer);

    const base64Data = `data:application/pdf;base64,${Buffer.from(result.data).toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: file.name.replace(/\.pdf$/i, '_compressed.pdf'),
      originalSize: result.originalSize,
      compressedSize: result.newSize,
      reductionPercentage: result.reductionPercentage,
      pageCount: result.pageCount,
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Compress PDF error:', err);
    return NextResponse.json(
      { error: 'Failed to compress PDF. Please ensure the file is a valid PDF.' },
      { status: 500 }
    );
  }
}
