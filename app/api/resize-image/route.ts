import { NextRequest, NextResponse } from 'next/server';
import { resizeImage } from '@/lib/image/resizer';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const width = parseInt(formData.get('width') as string, 10) || undefined;
    const height = parseInt(formData.get('height') as string, 10) || undefined;
    const maintainAspectRatio = formData.get('maintainAspectRatio') === 'true';
    const scalePercent = parseInt(formData.get('scalePercent') as string, 10) || undefined;
    const format = (formData.get('format') as any) || undefined;
    const quality = parseInt(formData.get('quality') as string, 10) || 90;

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum 50MB size limit.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const result = await resizeImage(inputBuffer, {
      width,
      height,
      maintainAspectRatio,
      scalePercent,
      format,
      quality,
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
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Resize image error:', err);
    return NextResponse.json(
      { error: 'Failed to resize image. Please check image format and dimensions.' },
      { status: 500 }
    );
  }
}
