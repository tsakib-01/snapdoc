import { NextRequest, NextResponse } from 'next/server';
import { watermarkPdfDocument } from '@/lib/pdf/watermarkPdf';
import { MAX_PDF_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const watermarkType = (formData.get('type') as 'text' | 'image') || 'text';
    const text = (formData.get('text') as string) || 'CONFIDENTIAL';
    const opacity = parseFloat(formData.get('opacity') as string) || 0.3;
    const rotation = parseFloat(formData.get('rotation') as string) || -45;
    const color = (formData.get('color') as string) || '#888888';
    const imageFile = formData.get('imageFile') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_PDF_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum 50MB size limit.' }, { status: 400 });
    }

    let imageBuffer: Buffer | undefined;
    if (watermarkType === 'image' && imageFile) {
      imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const watermarkedBytes = await watermarkPdfDocument(inputBuffer, {
      type: watermarkType,
      text,
      imageBuffer,
      opacity,
      rotation,
      color,
    });

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const base64Data = `data:application/pdf;base64,${Buffer.from(watermarkedBytes).toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: `${baseName}_watermarked.pdf`,
      size: watermarkedBytes.length,
      mimeType: 'application/pdf',
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Watermark PDF error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to add watermark to PDF.' },
      { status: 500 }
    );
  }
}
