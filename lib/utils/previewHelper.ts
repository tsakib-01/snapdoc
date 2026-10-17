/**
 * Universal, bulletproof helper to safely extract an orientation-corrected preview
 * and natural dimensions for any image (camera photos, iPhone HEIC, WhatsApp, JFIF, etc.)
 */
export async function getSafeImagePreview(
  file: File
): Promise<{ previewUrl: string; width: number; height: number }> {
  if (!file || file.size === 0) {
    throw new Error(
      `"${file?.name || 'File'}" has 0 bytes. If you dragged this from WhatsApp or another web app, please save the file to your computer first, then upload it.`
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

  // If format is HEIC or TIFF (unsupported by browser <img> on Windows), use server Sharp pipeline directly
  if (isHeicOrTiff) {
    try {
      const serverResult = await fetchServerPreview(file);
      if (serverResult) return serverResult;
    } catch (err) {
      console.warn('Server HEIC/TIFF preview failed:', err);
    }
  }

  // 1. Try client-side createImageBitmap (instant, auto-rotates camera photos from EXIF)
  if (typeof window !== 'undefined' && typeof createImageBitmap !== 'undefined' && !isHeicOrTiff) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const origW = bitmap.width;
      const origH = bitmap.height;

      // Constrain preview canvas dimensions to max 1200px for speed and memory efficiency
      const maxDim = 1200;
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
        const dataUrl = canvas.toDataURL(mime, 0.88);

        return {
          previewUrl: dataUrl,
          width: origW,
          height: origH,
        };
      }
      bitmap.close();
    } catch {
      // Fall through to next method
    }
  }

  // 2. Try FileReader readAsDataURL
  if (typeof window !== 'undefined' && typeof FileReader !== 'undefined' && !isHeicOrTiff) {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const dims = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
        img.onerror = () => resolve({ width: 800, height: 600 });
        img.src = dataUrl;
      });

      return {
        previewUrl: dataUrl,
        width: dims.width,
        height: dims.height,
      };
    } catch {
      // Fall through to server fallback
    }
  }

  // 3. Fallback to server sharp pipeline
  try {
    const serverResult = await fetchServerPreview(file);
    if (serverResult) return serverResult;
  } catch (err) {
    console.warn('Server fallback preview failed:', err);
  }

  // 4. Ultimate fallback: URL.createObjectURL (without instant revocation)
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
