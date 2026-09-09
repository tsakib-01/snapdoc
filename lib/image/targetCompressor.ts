import sharp from 'sharp';

export interface TargetCompressOptions {
  targetBytes: number;
  format?: 'original' | 'jpeg' | 'webp' | 'png';
  minQuality?: number;
  maxQuality?: number;
}

export interface CompressionResult {
  buffer: Buffer;
  size: number;
  originalSize: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  format: string;
  reductionPercentage: number;
  qualityUsed: number;
  scaleUsed: number;
}

/**
 * Iterative binary search target-size compression engine with dimensional auto-scaling
 */
export async function compressToTargetSize(
  inputBuffer: Buffer,
  options: TargetCompressOptions
): Promise<CompressionResult> {
  const originalSize = inputBuffer.length;
  const targetBytes = options.targetBytes;

  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  // Auto-detect format from input if 'original' or unspecified
  let targetFormat = options.format && options.format !== 'original'
    ? options.format
    : (metadata.format === 'png' ? 'png' : metadata.format === 'webp' ? 'webp' : 'jpeg');

  // Prepare base pipeline
  let baseSharp = sharp(inputBuffer);
  // ONLY flatten alpha to white if converting a transparent image explicitly to JPEG
  if (targetFormat === 'jpeg' && metadata.hasAlpha) {
    baseSharp = baseSharp.flatten({ background: { r: 255, g: 255, b: 255 } });
  }

  // Pre-render to clean normalized buffer
  const cleanInput = await baseSharp.toBuffer();

  const scaleFactors = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08];
  let bestBuffer: Buffer | null = null;
  let bestSize = Infinity;
  let bestQuality = 80;
  let bestScale = 1.0;
  let bestWidth = originalWidth;
  let bestHeight = originalHeight;

  // Scale down gradually if needed
  for (const scale of scaleFactors) {
    const targetW = Math.max(32, Math.round(originalWidth * scale));
    const targetH = Math.max(32, Math.round(originalHeight * scale));

    let lowQ = 10;
    let highQ = 92;
    let localBestBuffer: Buffer | null = null;
    let localBestQuality = lowQ;

    // Binary search quality for this scale
    while (lowQ <= highQ) {
      const midQ = Math.floor((lowQ + highQ) / 2);

      let pipeline = sharp(cleanInput);
      if (scale < 1.0) {
        pipeline = pipeline.resize(targetW, targetH, {
          fit: 'inside',
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        });
      }

      if (targetFormat === 'jpeg') {
        pipeline = pipeline.jpeg({
          quality: midQ,
          mozjpeg: true,
          chromaSubsampling: midQ < 40 ? '4:2:0' : '4:4:4',
          trellisQuantisation: true,
          overshootDeringing: true,
        });
      } else if (targetFormat === 'webp') {
        pipeline = pipeline.webp({
          quality: midQ,
          effort: 6,
          smartSubsample: true,
        });
      } else {
        // PNG
        pipeline = pipeline.png({
          compressionLevel: 9,
          palette: true,
          quality: midQ,
        });
      }

      const testBuffer = await pipeline.toBuffer();

      if (testBuffer.length <= targetBytes) {
        // Met target! Try higher quality to see if we can get better visual fidelity
        localBestBuffer = testBuffer;
        localBestQuality = midQ;
        lowQ = midQ + 1;
      } else {
        // Exceeded target, try lower quality
        highQ = midQ - 1;
      }
    }

    if (localBestBuffer && localBestBuffer.length <= targetBytes) {
      bestBuffer = localBestBuffer;
      bestSize = localBestBuffer.length;
      bestQuality = localBestQuality;
      bestScale = scale;
      bestWidth = targetW;
      bestHeight = targetH;
      // We found a valid quality at the highest possible scale. Stop early!
      break;
    }
  }

  // Fallback if target is impossibly small: produce smallest possible render in targetFormat
  if (!bestBuffer) {
    const minW = Math.min(128, originalWidth);
    const minH = Math.min(128, originalHeight);
    let fallbackPipeline = sharp(cleanInput).resize(minW, minH, { fit: 'inside' });
    
    if (targetFormat === 'png') {
      fallbackPipeline = fallbackPipeline.png({ compressionLevel: 9, palette: true, quality: 10 });
    } else if (targetFormat === 'webp') {
      fallbackPipeline = fallbackPipeline.webp({ quality: 10 });
    } else {
      fallbackPipeline = fallbackPipeline.jpeg({ quality: 5, mozjpeg: true, chromaSubsampling: '4:2:0' });
    }

    bestBuffer = await fallbackPipeline.toBuffer();
    bestSize = bestBuffer.length;
    bestQuality = 10;
    bestScale = minW / originalWidth;
    bestWidth = minW;
    bestHeight = minH;
  }

  const reductionPercentage = originalSize > 0
    ? Math.max(0, parseFloat((((originalSize - bestSize) / originalSize) * 100).toFixed(1)))
    : 0;

  return {
    buffer: bestBuffer,
    size: bestSize,
    originalSize,
    width: bestWidth,
    height: bestHeight,
    originalWidth,
    originalHeight,
    format: targetFormat,
    reductionPercentage,
    qualityUsed: bestQuality,
    scaleUsed: bestScale,
  };
}
