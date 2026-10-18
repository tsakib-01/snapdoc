'use client';

export interface TargetCompressClientOptions {
  targetKb: number;
  format?: 'original' | 'jpeg' | 'png' | 'webp';
  minQuality?: number;
  maxQuality?: number;
}

export interface ClientCompressionResult {
  success: boolean;
  originalName: string;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  format: string;
  mimeType: string;
  qualityUsed: number;
  dataUrl: string;
}

interface LoadedImage {
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  close: () => void;
}

/**
 * High-performance, memory-safe image loader supporting full EXIF orientation
 */
async function loadSourceImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await Promise.race([
        createImageBitmap(file, { imageOrientation: 'from-image' }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('createImageBitmap timeout')), 3000)),
      ]);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => {
          try {
            bitmap.close();
          } catch {}
        },
      };
    } catch {
      // Fallback to HTMLImageElement
    }
  }

  return new Promise<LoadedImage>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Image decode timeout'));
    }, 4000);

    img.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve({
        source: img,
        width: img.naturalWidth || img.width || 800,
        height: img.naturalHeight || img.height || 600,
        close: () => {},
      });
    };

    img.onerror = (e) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}

function calculateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return 0;
  const base64Len = dataUrl.length - commaIdx - 1;
  return Math.round((base64Len * 3) / 4);
}

/**
 * Client-Side Binary Search Target-Size Compression Engine
 * Compresses any image (even 10MB+ phone photos) to an exact target KB limit (e.g. 10kb, 100kb).
 */
export async function compressToTargetSizeInBrowser(
  file: File,
  options: TargetCompressClientOptions
): Promise<ClientCompressionResult> {
  const targetBytes = Math.max(1024, Math.round(options.targetKb * 1024));
  const loaded = await loadSourceImage(file);
  const { source, width: origW, height: origH, close } = loaded;

  try {
    let targetFormat = options.format || 'original';
    if (targetFormat === 'original') {
      if (file.type.includes('png') || file.name.toLowerCase().endsWith('.png')) {
        targetFormat = 'png';
      } else if (file.type.includes('webp') || file.name.toLowerCase().endsWith('.webp')) {
        targetFormat = 'webp';
      } else {
        targetFormat = 'jpeg';
      }
    }

    const mimeType =
      targetFormat === 'png' ? 'image/png' : targetFormat === 'webp' ? 'image/webp' : 'image/jpeg';

    const scaleFactors = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.05];

    let bestDataUrl = '';
    let bestBytes = Infinity;
    let bestQuality = 0.8;
    let bestWidth = origW;
    let bestHeight = origH;

    // Smallest result found in case target is extremely small (e.g. 5KB)
    let absoluteSmallestDataUrl = '';
    let absoluteSmallestBytes = Infinity;
    let absoluteSmallestWidth = origW;
    let absoluteSmallestHeight = origH;
    let absoluteSmallestQuality = 0.1;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: targetFormat !== 'jpeg' });
    if (!ctx) throw new Error('Could not obtain Canvas 2D context');

    for (const scale of scaleFactors) {
      const targetW = Math.max(16, Math.round(origW * scale));
      const targetH = Math.max(16, Math.round(origH * scale));

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.clearRect(0, 0, targetW, targetH);
      if (targetFormat === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
      }
      ctx.drawImage(source as CanvasImageSource, 0, 0, targetW, targetH);

      // Binary search quality for this scale factor
      let lowQ = 0.05;
      let highQ = 0.95;
      let scaleBestDataUrl = '';
      let scaleBestBytes = Infinity;
      let scaleBestQuality = 0.8;

      for (let iter = 0; iter < 7; iter++) {
        const midQ = parseFloat(((lowQ + highQ) / 2).toFixed(2));
        const dataUrl = canvas.toDataURL(mimeType, midQ);
        const bytes = calculateBase64Bytes(dataUrl);

        if (bytes < absoluteSmallestBytes) {
          absoluteSmallestBytes = bytes;
          absoluteSmallestDataUrl = dataUrl;
          absoluteSmallestWidth = targetW;
          absoluteSmallestHeight = targetH;
          absoluteSmallestQuality = midQ;
        }

        if (bytes <= targetBytes) {
          // Fits under target size!
          scaleBestDataUrl = dataUrl;
          scaleBestBytes = bytes;
          scaleBestQuality = midQ;
          // Try higher quality to fill closer to target size
          lowQ = midQ + 0.04;
        } else {
          // Too big, decrease quality
          highQ = midQ - 0.04;
        }
      }

      if (scaleBestDataUrl && scaleBestBytes <= targetBytes) {
        // We found a valid result under target size
        if (bestBytes === Infinity || (targetBytes - scaleBestBytes < targetBytes - bestBytes && scaleBestBytes <= targetBytes)) {
          bestDataUrl = scaleBestDataUrl;
          bestBytes = scaleBestBytes;
          bestQuality = scaleBestQuality;
          bestWidth = targetW;
          bestHeight = targetH;
        }

        // If quality is reasonable (>= 0.65) or scale is clean, we can stop
        if (scaleBestQuality >= 0.65) {
          break;
        }
      }
    }

    const finalDataUrl = bestDataUrl || absoluteSmallestDataUrl;
    const finalBytes = bestBytes !== Infinity ? bestBytes : absoluteSmallestBytes;
    const finalWidth = bestDataUrl ? bestWidth : absoluteSmallestWidth;
    const finalHeight = bestDataUrl ? bestHeight : absoluteSmallestHeight;
    const finalQuality = bestDataUrl ? bestQuality : absoluteSmallestQuality;

    const originalSize = file.size;
    const reductionPercentage =
      originalSize > 0
        ? Math.max(0, parseFloat((((originalSize - finalBytes) / originalSize) * 100).toFixed(1)))
        : 0;

    return {
      success: true,
      originalName: file.name,
      originalSize,
      compressedSize: finalBytes,
      reductionPercentage,
      width: finalWidth,
      height: finalHeight,
      originalWidth: origW,
      originalHeight: origH,
      format: targetFormat === 'jpeg' ? 'jpg' : targetFormat,
      mimeType,
      qualityUsed: Math.round(finalQuality * 100),
      dataUrl: finalDataUrl,
    };
  } finally {
    close();
  }
}

/**
 * Client-Side General Compression
 */
export async function compressImageGeneralInBrowser(
  file: File,
  options?: {
    quality?: number;
    format?: 'original' | 'jpeg' | 'png' | 'webp';
  }
): Promise<ClientCompressionResult> {
  const loaded = await loadSourceImage(file);
  const { source, width: origW, height: origH, close } = loaded;

  try {
    let targetFormat = options?.format || 'original';
    if (targetFormat === 'original') {
      if (file.type.includes('png') || file.name.toLowerCase().endsWith('.png')) {
        targetFormat = 'png';
      } else if (file.type.includes('webp') || file.name.toLowerCase().endsWith('.webp')) {
        targetFormat = 'webp';
      } else {
        targetFormat = 'jpeg';
      }
    }

    const mimeType =
      targetFormat === 'png' ? 'image/png' : targetFormat === 'webp' ? 'image/webp' : 'image/jpeg';
    const quality = options?.quality ? Math.min(1, Math.max(0.05, options.quality / 100)) : 0.8;

    const canvas = document.createElement('canvas');
    canvas.width = origW;
    canvas.height = origH;
    const ctx = canvas.getContext('2d', { alpha: targetFormat !== 'jpeg' });
    if (!ctx) throw new Error('Could not get Canvas context');

    if (targetFormat === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, origW, origH);
    }
    ctx.drawImage(source as CanvasImageSource, 0, 0, origW, origH);

    const dataUrl = canvas.toDataURL(mimeType, quality);
    const compressedSize = calculateBase64Bytes(dataUrl);
    const originalSize = file.size;
    const reductionPercentage =
      originalSize > 0
        ? Math.max(0, parseFloat((((originalSize - compressedSize) / originalSize) * 100).toFixed(1)))
        : 0;

    return {
      success: true,
      originalName: file.name,
      originalSize,
      compressedSize,
      reductionPercentage,
      width: origW,
      height: origH,
      originalWidth: origW,
      originalHeight: origH,
      format: targetFormat === 'jpeg' ? 'jpg' : targetFormat,
      mimeType,
      qualityUsed: Math.round(quality * 100),
      dataUrl,
    };
  } finally {
    close();
  }
}

/**
 * Client-Side Image Transformation (Rotate, Flip)
 */
export async function transformImageInBrowser(
  file: File,
  options: {
    rotateAngle?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    quality?: number;
  }
): Promise<ClientCompressionResult> {
  const loaded = await loadSourceImage(file);
  const { source, width: origW, height: origH, close } = loaded;

  try {
    const angle = (options.rotateAngle || 0) % 360;
    const is90or270 = Math.abs(angle) === 90 || Math.abs(angle) === 270;
    const outW = is90or270 ? origH : origW;
    const outH = is90or270 ? origW : origH;

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get Canvas context');

    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    if (angle !== 0) {
      ctx.rotate((angle * Math.PI) / 180);
    }
    ctx.scale(options.flipHorizontal ? -1 : 1, options.flipVertical ? -1 : 1);
    ctx.drawImage(source as CanvasImageSource, -origW / 2, -origH / 2, origW, origH);
    ctx.restore();

    const isPng = file.type.includes('png') || file.name.toLowerCase().endsWith('.png');
    const mimeType = isPng ? 'image/png' : 'image/jpeg';
    const quality = options.quality ? Math.min(1, Math.max(0.1, options.quality / 100)) : 0.92;
    const dataUrl = canvas.toDataURL(mimeType, quality);
    const compressedSize = calculateBase64Bytes(dataUrl);

    return {
      success: true,
      originalName: file.name,
      originalSize: file.size,
      compressedSize,
      reductionPercentage: 0,
      width: outW,
      height: outH,
      originalWidth: origW,
      originalHeight: origH,
      format: isPng ? 'png' : 'jpg',
      mimeType,
      qualityUsed: Math.round(quality * 100),
      dataUrl,
    };
  } finally {
    close();
  }
}
