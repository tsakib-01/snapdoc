import sharp from 'sharp';

export interface GeneralCompressOptions {
  quality: number; // 1 - 100
  format?: 'original' | 'jpeg' | 'png' | 'webp' | 'avif';
  stripMetadata?: boolean;
}

export async function compressImage(
  inputBuffer: Buffer,
  options: GeneralCompressOptions
) {
  const originalSize = inputBuffer.length;
  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  let targetFormat = options.format && options.format !== 'original'
    ? options.format
    : (metadata.format === 'png' ? 'png' : metadata.format === 'webp' ? 'webp' : 'jpeg');

  let pipeline = sharp(inputBuffer);

  // Flatten alpha if converting transparent image to JPEG
  if (targetFormat === 'jpeg' && metadata.hasAlpha) {
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
  }

  const quality = Math.min(100, Math.max(1, options.quality));

  if (targetFormat === 'jpeg') {
    pipeline = pipeline.jpeg({
      quality,
      mozjpeg: true,
      trellisQuantisation: true,
      overshootDeringing: true,
    });
  } else if (targetFormat === 'webp') {
    pipeline = pipeline.webp({
      quality,
      effort: 5,
    });
  } else if (targetFormat === 'png') {
    pipeline = pipeline.png({
      compressionLevel: 9,
      quality,
      palette: quality < 90,
    });
  } else if (targetFormat === 'avif') {
    pipeline = pipeline.avif({
      quality,
      effort: 4,
    });
  }

  const resultBuffer = await pipeline.toBuffer();
  const resultSize = resultBuffer.length;
  const reductionPercentage = originalSize > 0
    ? Math.max(0, parseFloat((((originalSize - resultSize) / originalSize) * 100).toFixed(1)))
    : 0;

  return {
    buffer: resultBuffer,
    size: resultSize,
    originalSize,
    width: originalWidth,
    height: originalHeight,
    format: targetFormat,
    reductionPercentage,
    qualityUsed: quality,
  };
}
