import sharp from 'sharp';

export interface ConvertOptions {
  targetFormat: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff';
  quality?: number;
  backgroundColor?: string; // hex like #ffffff or #000000
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  }
  return { r: 255, g: 255, b: 255 };
}

export async function convertImageFormat(
  inputBuffer: Buffer,
  options: ConvertOptions
) {
  const originalSize = inputBuffer.length;
  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  let pipeline = sharp(inputBuffer);
  const quality = options.quality || 90;

  if (options.targetFormat === 'jpeg') {
    const bg = options.backgroundColor ? parseHexColor(options.backgroundColor) : { r: 255, g: 255, b: 255 };
    if (metadata.hasAlpha) {
      pipeline = pipeline.flatten({ background: bg });
    }
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

  const resultBuffer = await pipeline.toBuffer();

  return {
    buffer: resultBuffer,
    size: resultBuffer.length,
    originalSize,
    width: originalWidth,
    height: originalHeight,
    format: options.targetFormat,
    reductionPercentage: originalSize > 0
      ? parseFloat((((originalSize - resultBuffer.length) / originalSize) * 100).toFixed(1))
      : 0,
  };
}
