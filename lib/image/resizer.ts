import sharp from 'sharp';

export interface ResizeOptions {
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  scalePercent?: number;
  fit?: 'inside' | 'cover' | 'fill' | 'contain';
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

export async function resizeImage(
  inputBuffer: Buffer,
  options: ResizeOptions
) {
  const originalSize = inputBuffer.length;
  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  let targetWidth: number | undefined = options.width;
  let targetHeight: number | undefined = options.height;

  if (options.scalePercent && options.scalePercent > 0) {
    const factor = options.scalePercent / 100;
    targetWidth = Math.max(1, Math.round(originalWidth * factor));
    targetHeight = Math.max(1, Math.round(originalHeight * factor));
  } else {
    if (options.maintainAspectRatio) {
      if (targetWidth && !targetHeight) {
        targetHeight = Math.max(1, Math.round((originalHeight / originalWidth) * targetWidth));
      } else if (targetHeight && !targetWidth) {
        targetWidth = Math.max(1, Math.round((originalWidth / originalHeight) * targetHeight));
      }
    }
  }

  let pipeline = sharp(inputBuffer).resize({
    width: targetWidth,
    height: targetHeight,
    fit: options.maintainAspectRatio ? (options.fit || 'inside') : 'fill',
    withoutEnlargement: false,
    kernel: sharp.kernel.lanczos3,
  });

  const targetFormat = options.format || (metadata.format === 'png' ? 'png' : metadata.format === 'webp' ? 'webp' : 'jpeg');

  if (targetFormat === 'jpeg') {
    if (metadata.hasAlpha) {
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    }
    pipeline = pipeline.jpeg({ quality: options.quality || 90, mozjpeg: true });
  } else if (targetFormat === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (targetFormat === 'webp') {
    pipeline = pipeline.webp({ quality: options.quality || 90 });
  }

  const resultBuffer = await pipeline.toBuffer();
  const resultMetadata = await sharp(resultBuffer).metadata();

  return {
    buffer: resultBuffer,
    size: resultBuffer.length,
    originalSize,
    width: resultMetadata.width || targetWidth || originalWidth,
    height: resultMetadata.height || targetHeight || originalHeight,
    originalWidth,
    originalHeight,
    format: targetFormat,
    reductionPercentage: originalSize > 0
      ? Math.max(0, parseFloat((((originalSize - resultBuffer.length) / originalSize) * 100).toFixed(1)))
      : 0,
  };
}
