import { NextRequest, NextResponse } from 'next/server';
import { compressToTargetSize } from '@/lib/image/targetCompressor';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetKb = parseFloat(formData.get('targetKb') as string) || 10;
    const format = (formData.get('format') as any) || 'original';

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum 50MB size limit.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const targetBytes = Math.round(targetKb * 1024);

    const result = await compressToTargetSize(inputBuffer, {
      targetBytes,
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
      originalWidth: result.originalWidth,
      originalHeight: result.originalHeight,
      format: result.format,
      mimeType,
      qualityUsed: result.qualityUsed,
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Target compression error:', err);
    return NextResponse.json(
      { error: 'Failed to compress image. Please ensure the image is a valid JPG, PNG, or WebP file.' },
      { status: 500 }
    );
  }
}
