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

  const metadata = await sharp(inputBuffer, { failOnError: false }).metadata();
  const isTransposed = metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8;
  const originalWidth = (isTransposed ? metadata.height : metadata.width) || 800;
  const originalHeight = (isTransposed ? metadata.width : metadata.height) || 600;

  // Auto-detect format from input if 'original' or unspecified
  let targetFormat = options.format && options.format !== 'original'
    ? options.format
    : (metadata.format === 'png' ? 'png' : metadata.format === 'webp' ? 'webp' : 'jpeg');

  // Prepare base pipeline with EXIF auto-rotation
  let baseSharp = sharp(inputBuffer, { failOnError: false }).rotate();
  // ONLY flatten alpha to white if converting a transparent image explicitly to JPEG
  if (targetFormat === 'jpeg' && metadata.hasAlpha) {
    baseSharp = baseSharp.flatten({ background: { r: 255, g: 255, b: 255 } });
  }

  // Pre-render to clean normalized buffer
  const cleanInput = await baseSharp.toBuffer();

  const scaleFactors = [
    1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5,
    0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.16, 0.12, 0.08, 0.05, 0.03
  ];
  let bestBuffer: Buffer | null = null;
  let bestSize = Infinity;
  let bestQuality = 80;
  let bestScale = 1.0;
  let bestWidth = originalWidth;
  let bestHeight = originalHeight;

  // Scale down gradually if needed
  for (const scale of scaleFactors) {
    const targetW = Math.max(20, Math.round(originalWidth * scale));
    const targetH = Math.max(20, Math.round(originalHeight * scale));

    let lowQ = 5;
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
      // If quality is reasonable (>= 60), stop early at the highest possible scale
      if (localBestQuality >= 60) {
        break;
      }
    }
  }

  // Fallback if target is impossibly small: produce smallest possible render strictly <= targetBytes
  if (!bestBuffer || bestSize > targetBytes) {
    let fbW = Math.min(128, originalWidth);
    let fbH = Math.min(128, originalHeight);
    
    while (fbW > 16) {
      const fallbackBuffer = await sharp(cleanInput)
        .resize(fbW, fbH, { fit: 'inside' })
        .jpeg({ quality: 5, mozjpeg: true, chromaSubsampling: '4:2:0' })
        .toBuffer();

      if (fallbackBuffer.length <= targetBytes || fbW <= 32) {
        bestBuffer = fallbackBuffer;
        bestSize = fallbackBuffer.length;
        bestQuality = 5;
        bestScale = fbW / originalWidth;
        bestWidth = fbW;
        bestHeight = fbH;
        targetFormat = 'jpeg';
        break;
      }
      fbW = Math.round(fbW * 0.7);
      fbH = Math.round(fbH * 0.7);
    }
  }

  const outputBuffer = bestBuffer || cleanInput;
  const finalSize = bestSize !== Infinity ? bestSize : outputBuffer.length;

  const reductionPercentage = originalSize > 0
    ? Math.max(0, parseFloat((((originalSize - finalSize) / originalSize) * 100).toFixed(1)))
    : 0;

  return {
    buffer: outputBuffer,
    size: finalSize,
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
