import { NextRequest, NextResponse } from 'next/server';
import { convertImageFormat } from '@/lib/image/converter';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetFormat = (formData.get('targetFormat') as any) || 'png';
    const quality = parseInt(formData.get('quality') as string, 10) || 90;
    const backgroundColor = (formData.get('backgroundColor') as string) || '#ffffff';

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum 50MB size limit.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const result = await convertImageFormat(inputBuffer, {
      targetFormat,
      quality,
      backgroundColor,
    });

    const mimeType = result.format === 'png' ? 'image/png' : result.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const base64Data = `data:${mimeType};base64,${result.buffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      originalName: file.name,
      originalSize: result.originalSize,
      compressedSize: result.size,
      reductionPercentage: result.reductionPercentage,
      width: result.width,
      height: result.height,
      format: result.format,
      mimeType,
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Convert image error:', err);
    return NextResponse.json(
      { error: 'Failed to convert image. Please check file format.' },
      { status: 500 }
    );
  }
}
