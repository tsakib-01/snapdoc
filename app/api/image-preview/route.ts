import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: 'Empty file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Auto-orient according to EXIF and downscale to max 1200px for instant thumbnail/preview
    const previewBuffer = await image
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    const dataUrl = `data:image/jpeg;base64,${previewBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      previewUrl: dataUrl,
      width: metadata.width || 800,
      height: metadata.height || 600,
      format: metadata.format || 'jpeg',
    });
  } catch (err: any) {
    console.error('Image preview extraction error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to generate preview' }, { status: 500 });
  }
}
