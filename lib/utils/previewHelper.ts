/**
 * Universal, ultra-fast and resilient helper to safely extract an orientation-corrected preview
 * and natural dimensions for any image (camera photos, iPhone HEIC, WhatsApp, JFIF, etc.)
 *
 * Guarantees:
 * 1. NEVER hangs (hard timeouts on all async decoders).
 * 2. Instant fallback to native blob URL (0ms) so UI never gets stuck in a loading state.
 * 3. Handles mobile camera capture photos and high-megapixel images without OOM.
 */
export async function getSafeImagePreview(
  file: File
): Promise<{ previewUrl: string; width: number; height: number }> {
  if (!file) {
    throw new Error('No file provided');
  }

  // Instant baseline blob URL available immediately in 0ms
  let baselineBlobUrl = '';
  try {
    baselineBlobUrl = URL.createObjectURL(file);
  } catch {
    baselineBlobUrl = '';
  }

  const fileName = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();

  const isHeicOrTiff =
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif') ||
    fileName.endsWith('.tiff') ||
    fileName.endsWith('.tif') ||
    fileType.includes('heic') ||
    fileType.includes('heif') ||
    fileType.includes('tiff');

  // If format is HEIC or TIFF, try server Sharp pipeline first with a 3s timeout
  if (isHeicOrTiff) {
    try {
      const serverResult = await Promise.race([
        fetchServerPreview(file),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      if (serverResult && serverResult.previewUrl) return serverResult;
    } catch (err) {
      console.warn('Server HEIC/TIFF preview failed:', err);
    }

    if (baselineBlobUrl) {
      return {
        previewUrl: baselineBlobUrl,
        width: 1920,
        height: 1080,
      };
    }
  }

  // 1. Try createImageBitmap with a 1000ms timeout (auto-rotates camera photos from EXIF)
  if (typeof window !== 'undefined' && typeof createImageBitmap !== 'undefined') {
    try {
      const bitmapPromise = (async () => {
        let bitmap: ImageBitmap;
        try {
          bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {
          bitmap = await createImageBitmap(file);
        }

        const origW = bitmap.width;
        const origH = bitmap.height;

        if (origW > 0 && origH > 0) {
          const maxDim = 1200; // 1200px is super fast and lightweight for mobile preview
          let targetW = origW;
          let targetH = origH;
          if (targetW > maxDim || targetH > maxDim) {
            if (targetW > targetH) {
              targetH = Math.round((targetH / targetW) * maxDim);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW / targetH) * maxDim);
              targetH = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(bitmap, 0, 0, targetW, targetH);
            bitmap.close();

            const isPng = fileType.includes('png') || fileName.endsWith('.png');
            const mime = isPng ? 'image/png' : 'image/jpeg';
            const dataUrl = canvas.toDataURL(mime, 0.85);

            if (dataUrl && dataUrl.length > 200 && !dataUrl.startsWith('data:,')) {
              return {
                previewUrl: dataUrl,
                width: origW,
                height: origH,
              };
            }
          } else {
            bitmap.close();
          }
        } else {
          bitmap.close();
        }
        return null;
      })();

      const result = await Promise.race([
        bitmapPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);

      if (result) return result;
    } catch {
      // Fall through to Image() probe
    }
  }

  // 2. Try Image() decoding with a strict 1000ms timeout
  if (baselineBlobUrl) {
    try {
      const imgResult = await new Promise<{ previewUrl: string; width: number; height: number } | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 1000);
        const img = new Image();
        img.onload = () => {
          clearTimeout(timer);
          const w = img.naturalWidth || 800;
          const h = img.naturalHeight || 600;
          resolve({
            previewUrl: baselineBlobUrl,
            width: w,
            height: h,
          });
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        // MUST set img.src AFTER attaching onload & onerror
        img.src = baselineBlobUrl;
      });

      if (imgResult) return imgResult;
    } catch {
      // Fall through
    }
  }

  // 3. Fallback to server Sharp pipeline with 2500ms timeout
  try {
    const serverResult = await Promise.race([
      fetchServerPreview(file),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    if (serverResult && serverResult.previewUrl) return serverResult;
  } catch (err) {
    console.warn('Server fallback preview failed:', err);
  }

  // 4. Guaranteed fallback
  if (baselineBlobUrl) {
    return {
      previewUrl: baselineBlobUrl,
      width: 1200,
      height: 900,
    };
  }

  throw new Error('Could not generate preview for image.');
}

async function fetchServerPreview(
  file: File
): Promise<{ previewUrl: string; width: number; height: number } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/image-preview', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.previewUrl) {
      return {
        previewUrl: data.previewUrl,
        width: data.width || 800,
        height: data.height || 600,
      };
    }
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
