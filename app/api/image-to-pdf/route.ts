import { NextRequest, NextResponse } from 'next/server';
import { convertImagesToPdf, ImageInputItem } from '@/lib/pdf/imageToPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const pageSize = (formData.get('pageSize') as 'A4' | 'LETTER' | 'FIT') || 'A4';
    const orientation = (formData.get('orientation') as 'portrait' | 'landscape' | 'auto') || 'portrait';
    const margin = (formData.get('margin') as 'none' | 'small' | 'large') || 'small';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Please upload at least one image.' }, { status: 400 });
    }

    const imageItems: ImageInputItem[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      imageItems.push({
        buffer,
        name: file.name,
      });
    }

    const pdfBytes = await convertImagesToPdf(imageItems, {
      pageSize,
      orientation,
      margin,
    });

    const base64Data = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: 'converted_document.pdf',
      pageCount: files.length,
      fileSize: pdfBytes.length,
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Image to PDF error:', err);
    return NextResponse.json(
      { error: 'Failed to convert images to PDF. Please ensure images are valid.' },
      { status: 500 }
    );
  }
}
