import sharp from 'sharp';

export interface TransformOptions {
  rotateAngle?: number; // 90, 180, 270
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  crop?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  quality?: number;
}

export async function transformImage(
  inputBuffer: Buffer,
  options: TransformOptions
) {
  const originalSize = inputBuffer.length;
  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  let pipeline = sharp(inputBuffer);

  // 1. Crop first if requested
  if (options.crop) {
    const left = Math.max(0, Math.min(originalWidth - 1, Math.round(options.crop.left)));
    const top = Math.max(0, Math.min(originalHeight - 1, Math.round(options.crop.top)));
    const width = Math.max(1, Math.min(originalWidth - left, Math.round(options.crop.width)));
    const height = Math.max(1, Math.min(originalHeight - top, Math.round(options.crop.height)));

    pipeline = pipeline.extract({ left, top, width, height });
  }

  // 2. Rotate
  if (options.rotateAngle) {
    pipeline = pipeline.rotate(options.rotateAngle);
  }

  // 3. Flip / Flop
  if (options.flipVertical) {
    pipeline = pipeline.flip(); // vertical
  }
  if (options.flipHorizontal) {
    pipeline = pipeline.flop(); // horizontal
  }

  const targetFormat = metadata.format === 'png' ? 'png' : metadata.format === 'webp' ? 'webp' : 'jpeg';

  if (targetFormat === 'jpeg') {
    pipeline = pipeline.jpeg({ quality: options.quality || 90, mozjpeg: true });
  } else if (targetFormat === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (targetFormat === 'webp') {
    pipeline = pipeline.webp({ quality: options.quality || 90 });
  }

  const resultBuffer = await pipeline.toBuffer();
  const resultMeta = await sharp(resultBuffer).metadata();

  return {
    buffer: resultBuffer,
    size: resultBuffer.length,
    originalSize,
    width: resultMeta.width || originalWidth,
    height: resultMeta.height || originalHeight,
    originalWidth,
    originalHeight,
    format: targetFormat,
  };
}
