/**
 * Universal, bulletproof helper to safely extract an orientation-corrected preview
 * and natural dimensions for any image (camera photos, iPhone HEIC, WhatsApp, JFIF, etc.)
 */
export async function getSafeImagePreview(
  file: File
): Promise<{ previewUrl: string; width: number; height: number }> {
  if (!file || file.size === 0) {
    throw new Error(
      `"${file?.name || 'File'}" has 0 bytes. If you took this directly with your camera, please wait a moment or choose it from your photo library.`
    );
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

  // If format is HEIC or TIFF (unsupported by standard browser <img> on Windows/Android), use server Sharp pipeline directly
  if (isHeicOrTiff) {
    try {
      const serverResult = await fetchServerPreview(file);
      if (serverResult && serverResult.previewUrl) return serverResult;
    } catch (err) {
      console.warn('Server HEIC/TIFF preview failed, trying client decoders:', err);
    }
  }

  // 1. Try client-side createImageBitmap (instant, auto-rotates camera photos from EXIF)
  if (typeof window !== 'undefined' && typeof createImageBitmap !== 'undefined' && !isHeicOrTiff) {
    try {
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        bitmap = await createImageBitmap(file);
      }

      const origW = bitmap.width;
      const origH = bitmap.height;

      if (origW > 0 && origH > 0) {
        // Constrain preview canvas dimensions to max 1600px for speed and memory efficiency
        const maxDim = 1600;
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
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(bitmap, 0, 0, targetW, targetH);
          bitmap.close();

          const isPng = fileType.includes('png') || fileName.endsWith('.png');
          const mime = isPng ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mime, 0.90);

          if (dataUrl && dataUrl.length > 100) {
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
    } catch {
      // Fall through to next method
    }
  }

  // 2. Try Image() decoding with objectUrl (zero heap memory duplication compared to FileReader)
  if (typeof window !== 'undefined' && typeof URL !== 'undefined' && !isHeicOrTiff) {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Browser failed to decode image'));
        if (typeof img.decode === 'function') {
          img.decode().then(resolve).catch(() => {
            // decode rejected, wait for onload/onerror
          });
        }
      });

      const w = img.naturalWidth;
      const h = img.naturalHeight;

      if (w > 0 && h > 0) {
        const maxDim = 1600;
        let targetW = w;
        let targetH = h;
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
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const isPng = fileType.includes('png') || fileName.endsWith('.png');
          const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.90);
          URL.revokeObjectURL(objectUrl);

          return {
            previewUrl: dataUrl,
            width: w,
            height: h,
          };
        }
      }
      URL.revokeObjectURL(objectUrl);
    } catch {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
      // Fall through to server fallback
    }
  }

  // 3. Fallback to server Sharp pipeline (handles HEIC, camera RAW, high-megapixel, EXIF rotation)
  try {
    const serverResult = await fetchServerPreview(file);
    if (serverResult && serverResult.previewUrl) return serverResult;
  } catch (err) {
    console.warn('Server fallback preview failed:', err);
  }

  // 4. Ultimate fallback: URL.createObjectURL
  if (typeof window !== 'undefined' && typeof URL !== 'undefined') {
    const blobUrl = URL.createObjectURL(file);
    return {
      previewUrl: blobUrl,
      width: 800,
      height: 600,
    };
  }

  throw new Error('Could not generate preview for image.');
}

async function fetchServerPreview(
  file: File
): Promise<{ previewUrl: string; width: number; height: number } | null> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/image-preview', {
    method: 'POST',
    body: formData,
  });

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
}
