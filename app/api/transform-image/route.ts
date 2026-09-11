import { NextRequest, NextResponse } from 'next/server';
import { transformImage } from '@/lib/image/transformer';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rotateAngle = parseInt(formData.get('rotateAngle') as string, 10) || undefined;
    const flipHorizontal = formData.get('flipHorizontal') === 'true';
    const flipVertical = formData.get('flipVertical') === 'true';
    const cropJson = formData.get('crop') as string;
    const crop = cropJson ? JSON.parse(cropJson) : undefined;
    const quality = parseInt(formData.get('quality') as string, 10) || 92;

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum 50MB size limit.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const result = await transformImage(inputBuffer, {
      rotateAngle,
      flipHorizontal,
      flipVertical,
      crop,
      quality,
    });

    const mimeType = result.format === 'png' ? 'image/png' : result.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const base64Data = `data:${mimeType};base64,${result.buffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      originalName: file.name,
      originalSize: result.originalSize,
      compressedSize: result.size,
      width: result.width,
      height: result.height,
      originalWidth: result.originalWidth,
      originalHeight: result.originalHeight,
      format: result.format,
      mimeType,
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Transform image error:', err);
    return NextResponse.json(
      { error: 'Failed to transform image. Please check parameters and file integrity.' },
      { status: 500 }
    );
  }
}
