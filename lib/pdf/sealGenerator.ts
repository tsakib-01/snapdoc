/**
 * Professional Digital Seal & Stamp Generator
 * Creates authentic circular and rectangular corporate seals with curved text,
 * custom logos, registration numbers, authorized signatories, dates, and color styles.
 */

export interface SealConfig {
  shape: 'circle' | 'rectangle';
  companyName: string;
  regNumber?: string;
  sealTitle: string;
  authorizedName: string;
  includeDate: boolean;
  dateStr?: string;
  color: string;
  logoDataUrl?: string | null;
}

/**
 * Draws text curved along a circular arc on a canvas context.
 */
function drawCurvedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  clockwise: boolean = true
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Measure total width to distribute characters evenly
  const chars = text.split('');
  const charWidths = chars.map((ch) => ctx.measureText(ch).width);
  const totalWidth = charWidths.reduce((a, b) => a + b, 0);
  const totalAngle = totalWidth / radius;

  let currentAngle = clockwise
    ? startAngle - totalAngle / 2
    : startAngle + totalAngle / 2;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const chWidth = charWidths[i];
    const chAngle = chWidth / radius;

    if (clockwise) {
      currentAngle += chAngle / 2;
      ctx.save();
      ctx.rotate(currentAngle);
      ctx.translate(0, -radius);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      currentAngle += chAngle / 2;
    } else {
      currentAngle -= chAngle / 2;
      ctx.save();
      ctx.rotate(currentAngle);
      ctx.translate(0, radius);
      ctx.scale(-1, -1); // Flip upright for bottom arc
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      currentAngle -= chAngle / 2;
    }
  }

  ctx.restore();
}

/**
 * Generates an official seal PNG data URL based on user configuration.
 */
export async function generateOfficialSeal(config: SealConfig): Promise<string> {
  if (typeof document === 'undefined') return '';

  const size = 600;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const color = config.color || '#1e40af';

  if (config.shape === 'circle') {
    // --- CIRCULAR OFFICIAL SEAL ---

    // 1. Outer Heavy Ring
    ctx.lineWidth = 10;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 270, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Middle Beaded / Thin Ring
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 255, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Inner Decorative Ring
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 185, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Fine Inset Ring
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 175, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Decorative Star Accents at left and right (9 o'clock and 3 o'clock)
    ctx.fillStyle = color;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', cx - 220, cy);
    ctx.fillText('★', cx + 220, cy);

    // 6. Curved Company Name (Top Arc)
    ctx.fillStyle = color;
    ctx.font = 'bold 26px "Arial", "Helvetica", sans-serif';
    const topText = (config.companyName || 'ORGANIZATION NAME').toUpperCase();
    drawCurvedText(ctx, topText, cx, cy, 220, -Math.PI / 2, true);

    // 7. Curved Registration / License / Subtitle (Bottom Arc)
    ctx.font = 'bold 20px "Arial", "Helvetica", sans-serif';
    const bottomText = (config.regNumber ? `REG NO: ${config.regNumber}` : 'AUTHENTIC CERTIFIED SEAL').toUpperCase();
    drawCurvedText(ctx, bottomText, cx, cy, 220, Math.PI / 2, false);

    // 8. Center Area Content
    if (config.logoDataUrl) {
      // Draw user's uploaded logo centered in the inner ring
      try {
        const logoImg = await loadImage(config.logoDataUrl);
        const logoSize = 120;
        ctx.save();
        // Clip to inner circle
        ctx.beginPath();
        ctx.arc(cx, cy - 20, 65, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, cx - logoSize / 2, cy - 20 - logoSize / 2, logoSize, logoSize);
        ctx.restore();
      } catch (_) {
        drawDefaultEmblem(ctx, cx, cy - 20, color);
      }
    } else {
      drawDefaultEmblem(ctx, cx, cy - 25, color);
    }

    // 9. Seal Title Banner (Across Center)
    ctx.fillStyle = color;
    ctx.font = '900 24px "Arial Black", "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const title = (config.sealTitle || 'OFFICIAL SEAL').toUpperCase();
    ctx.fillText(title, cx, cy + 45);

    // 10. Authorized Signatory Name
    if (config.authorizedName) {
      ctx.font = 'bold 17px "Arial", sans-serif';
      ctx.fillText(config.authorizedName, cx, cy + 78);
    }

    // 11. Optional Date
    if (config.includeDate) {
      const dateText = config.dateStr || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }).toUpperCase();
      ctx.font = '600 14px monospace';
      ctx.fillText(`DATE: ${dateText}`, cx, cy + 105);
    }

  } else {
    // --- RECTANGULAR BOXED OFFICIAL STAMP ---
    const pad = 30;
    const w = size - pad * 2;
    const h = size - pad * 2;

    // Outer Thick Border
    ctx.lineWidth = 8;
    ctx.strokeStyle = color;
    ctx.strokeRect(pad, pad, w, h);

    // Inner Double Line
    ctx.lineWidth = 2;
    ctx.strokeRect(pad + 12, pad + 12, w - 24, h - 24);

    // Header Background Stripe
    ctx.fillStyle = color;
    ctx.fillRect(pad + 14, pad + 14, w - 28, 90);

    // Header Company Name (White on Color)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((config.companyName || 'ORGANIZATION NAME').toUpperCase(), cx, pad + 60);

    // Title
    ctx.fillStyle = color;
    ctx.font = '900 32px "Arial Black", sans-serif';
    ctx.fillText((config.sealTitle || 'OFFICIAL SEAL').toUpperCase(), cx, pad + 160);

    // Logo / Emblem
    if (config.logoDataUrl) {
      try {
        const logoImg = await loadImage(config.logoDataUrl);
        const logoSize = 100;
        ctx.drawImage(logoImg, cx - logoSize / 2, pad + 195, logoSize, logoSize);
      } catch (_) {
        drawDefaultEmblem(ctx, cx, pad + 245, color);
      }
    } else {
      drawDefaultEmblem(ctx, cx, pad + 245, color);
    }

    // Registration Number
    if (config.regNumber) {
      ctx.fillStyle = color;
      ctx.font = 'bold 20px "Arial", sans-serif';
      ctx.fillText(`REGISTRATION NO: ${config.regNumber}`, cx, pad + 345);
    }

    // Signatory
    if (config.authorizedName) {
      ctx.font = 'bold 22px "Arial", sans-serif';
      ctx.fillText(`AUTHORIZED BY: ${config.authorizedName.toUpperCase()}`, cx, pad + 390);
    }

    // Date
    if (config.includeDate) {
      const dateText = config.dateStr || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }).toUpperCase();
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`VERIFIED DATE: ${dateText}`, cx, pad + 435);
    }

    // Footer Security Code
    ctx.font = '13px monospace';
    ctx.fillStyle = color;
    ctx.fillText('SNAPDOC VERIFIED DIGITAL CREDENTIAL • AUDIT COMPLIANT', cx, pad + 480);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Draws an elegant default star/crest emblem when no custom logo is uploaded.
 */
function drawDefaultEmblem(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;

  // Center Shield / Crest Outline
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.stroke();

  // Central 5-Point Star
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 0, 0);

  ctx.restore();
}

/**
 * Helper to asynchronously load image dataUrl into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Removes white or near-white background from uploaded seals
 * so they blend authentically over document pages.
 */
export async function removeWhiteBackground(imageDataUrl: string, threshold = 220): Promise<string> {
  if (typeof document === 'undefined') return imageDataUrl;

  try {
    const img = await loadImage(imageDataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageDataUrl;

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // If pixel is near-white, make it transparent
      if (r > threshold && g > threshold && b > threshold) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (_) {
    return imageDataUrl;
  }
}
