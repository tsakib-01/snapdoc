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

function replaceBorderCheckerboard(
  rawBuffer: Buffer,
  width: number,
  height: number,
  channels: number,
  targetColor: { r: number; g: number; b: number }
): Buffer {
  const isChecker = (idx: number) => {
    const r = rawBuffer[idx];
    const g = rawBuffer[idx + 1];
    const b = rawBuffer[idx + 2];
    return r > 210 && g > 210 && b > 210 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18;
  };

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  for (let x = 0; x < width; x++) {
    if (isChecker(x * channels)) { visited[x] = 1; queue.push(x); }
    const botIdx = (height - 1) * width + x;
    if (isChecker(botIdx * channels)) { visited[botIdx] = 1; queue.push(botIdx); }
  }
  for (let y = 0; y < height; y++) {
    const leftIdx = y * width;
    if (!visited[leftIdx] && isChecker(leftIdx * channels)) { visited[leftIdx] = 1; queue.push(leftIdx); }
    const rightIdx = y * width + (width - 1);
    if (!visited[rightIdx] && isChecker(rightIdx * channels)) { visited[rightIdx] = 1; queue.push(rightIdx); }
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const neighbors = [
      cx > 0 ? curr - 1 : -1,
      cx < width - 1 ? curr + 1 : -1,
      cy > 0 ? curr - width : -1,
      cy < height - 1 ? curr + width : -1,
    ];

    for (const nb of neighbors) {
      if (nb >= 0 && !visited[nb] && isChecker(nb * channels)) {
        visited[nb] = 1;
        queue.push(nb);
      }
    }
  }

  if (queue.length > width * height * 0.05) {
    const out = Buffer.from(rawBuffer);
    for (let i = 0; i < width * height; i++) {
      if (visited[i]) {
        out[i * channels] = targetColor.r;
        out[i * channels + 1] = targetColor.g;
        out[i * channels + 2] = targetColor.b;
        if (channels === 4) {
          out[i * channels + 3] = 255;
        }
      }
    }
    return out;
  }

  return rawBuffer;
}

export async function convertImageFormat(
  inputBuffer: Buffer,
  options: ConvertOptions
) {
  const originalSize = inputBuffer.length;
  const metadata = await sharp(inputBuffer, { failOnError: false }).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  const bg = options.backgroundColor ? parseHexColor(options.backgroundColor) : { r: 255, g: 255, b: 255 };
  let workingBuffer = inputBuffer;

  if (options.backgroundColor) {
    try {
      const { data: raw, info } = await sharp(inputBuffer, { failOnError: false })
        .rotate()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const cleaned = replaceBorderCheckerboard(raw, info.width, info.height, info.channels, bg);
      if (cleaned !== raw) {
        workingBuffer = await sharp(cleaned, {
          raw: { width: info.width, height: info.height, channels: info.channels },
        })
          .png()
          .toBuffer();
      }
    } catch {
      // Fallback to original buffer on exotic raw format error
    }
  }

  let pipeline = sharp(workingBuffer, { failOnError: false }).rotate();
  const quality = options.quality || 90;

  if (options.targetFormat === 'jpeg') {
    pipeline = pipeline.flatten({ background: bg });
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
