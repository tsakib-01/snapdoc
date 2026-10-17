import sharp from 'sharp';

export interface ConvertOptions {
  targetFormat: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff';
  quality?: number;
}

export async function convertImageFormat(
  inputBuffer: Buffer,
  options: ConvertOptions
) {
  const originalSize = inputBuffer.length;
  const metadata = await sharp(inputBuffer, { failOnError: false }).metadata();
  const isTransposed = metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8;
  const originalWidth = (isTransposed ? metadata.height : metadata.width) || 800;
  const originalHeight = (isTransposed ? metadata.width : metadata.height) || 600;

  let pipeline = sharp(inputBuffer, { failOnError: false }).rotate();
  const quality = options.quality || 90;

  if (options.targetFormat === 'jpeg') {
    // For JPEG output: flatten alpha transparency onto clean white background
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  } else if (options.targetFormat === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (options.targetFormat === 'webp') {
    pipeline = pipeline.webp({ quality, effort: 5 });
  } else if (options.targetFormat === 'avif') {
    pipeline = pipeline.avif({ quality, effort: 4 });
  } else if (options.targetFormat === 'tiff') {
    pipeline = pipeline.tiff({ quality });
  }

  const { data: resultBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: resultBuffer,
    size: resultBuffer.length,
    originalSize,
    width: info.width || originalWidth,
    height: info.height || originalHeight,
    format: options.targetFormat,
    reductionPercentage:
      originalSize > 0
        ? parseFloat((((originalSize - resultBuffer.length) / originalSize) * 100).toFixed(1))
        : 0,
  };
}
