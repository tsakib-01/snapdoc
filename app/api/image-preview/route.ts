import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: 'Empty file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawImage = sharp(buffer, { failOnError: false });
    const metadata = await rawImage.metadata();

    const isRotated90 = metadata.orientation && [5, 6, 7, 8].includes(metadata.orientation);
    const naturalWidth = isRotated90 ? (metadata.height || 800) : (metadata.width || 800);
    const naturalHeight = isRotated90 ? (metadata.width || 600) : (metadata.height || 600);

    // Auto-orient according to EXIF and downscale to max 1600px for instant thumbnail/preview
    const previewBuffer = await rawImage
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const dataUrl = `data:image/jpeg;base64,${previewBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      previewUrl: dataUrl,
      width: naturalWidth,
      height: naturalHeight,
      format: metadata.format || 'jpeg',
    });
  } catch (err: any) {
    console.error('Image preview extraction error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to generate preview' }, { status: 500 });
  }
}
