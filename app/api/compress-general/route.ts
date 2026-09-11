import { NextRequest, NextResponse } from 'next/server';
import { compressImage } from '@/lib/image/generalCompressor';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const quality = parseInt(formData.get('quality') as string, 10) || 80;
    const format = (formData.get('format') as any) || 'original';

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum 50MB size limit.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const result = await compressImage(inputBuffer, {
      quality,
      format,
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
      qualityUsed: result.qualityUsed,
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('General compress error:', err);
    return NextResponse.json(
      { error: 'Failed to compress image. Please try again with a supported image.' },
      { status: 500 }
    );
  }
}
