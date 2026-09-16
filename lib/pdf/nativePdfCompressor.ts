import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import sharp from 'sharp';
import zlib from 'zlib';

function unfilterPng(inflated: Buffer, width: number, height: number, bytesPerPixel: number): Buffer {
  const rowBytes = width * bytesPerPixel;
  const stride = rowBytes + 1;
  const out = Buffer.alloc(width * height * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    if (rowStart >= inflated.length) break;
    const filter = inflated[rowStart];
    const prevRowStart = (y - 1) * rowBytes;
    const currOutStart = y * rowBytes;

    for (let x = 0; x < rowBytes; x++) {
      const rawIdx = rowStart + 1 + x;
      if (rawIdx >= inflated.length) break;
      const raw = inflated[rawIdx];
      const a = x >= bytesPerPixel ? out[currOutStart + x - bytesPerPixel] : 0;
      const b = y > 0 ? out[prevRowStart + x] : 0;
      const c = y > 0 && x >= bytesPerPixel ? out[prevRowStart + x - bytesPerPixel] : 0;

      let val = raw;
      if (filter === 1) {
        val = (raw + a) & 0xff;
      } else if (filter === 2) {
        val = (raw + b) & 0xff;
      } else if (filter === 3) {
        val = (raw + Math.floor((a + b) / 2)) & 0xff;
      } else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = a;
        if (pb < pa && pb < pc) pr = b;
        else if (pc < pa) pr = c;
        val = (raw + pr) & 0xff;
      }
      out[currOutStart + x] = val;
    }
  }
  return out;
}

export async function compressPdfNative(
  pdfBuffer: Buffer,
  level: '25' | '50' | '75' | string = '50'
): Promise<{ buffer: Buffer; replacedImages: number } | null> {
  const levelStr = String(level).trim().toLowerCase();
  let targetDim = 1150;
  let targetQuality = 65;

  if (levelStr === '25' || levelStr === 'low' || levelStr === 'lossless') {
    targetDim = 1800;
    targetQuality = 82;
  } else if (levelStr === '75' || levelStr === 'extreme' || levelStr === 'high') {
    targetDim = 750;
    targetQuality = 42;
  } else {
    targetDim = 1150;
    targetQuality = 65;
  }

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    const context = pdfDoc.context;
    const indirectObjects = context.enumerateIndirectObjects();
    let replacedImages = 0;

    for (const [ref, obj] of indirectObjects) {
      if (!(obj instanceof PDFRawStream)) continue;
      const dict = obj.dict;
      const subtype = dict.get(PDFName.of('Subtype'));
      if (!subtype || subtype.toString() !== '/Image') continue;

      const filterObj = dict.get(PDFName.of('Filter'));
      const filter = filterObj ? filterObj.toString() : '';
      const widthObj = dict.get(PDFName.of('Width'));
      const heightObj = dict.get(PDFName.of('Height'));
      const width = (widthObj as any)?.numberValue;
      const height = (heightObj as any)?.numberValue;
      const colorSpace = dict.get(PDFName.of('ColorSpace'))?.toString() || '';
      const rawBytes = obj.contents;

      let compBuf: Buffer | null = null;

      // 1. DCTDecode (Standard JPEG)
      if (filter === '/DCTDecode' || filter.includes('DCTDecode')) {
        try {
          let pipeline = sharp(Buffer.from(rawBytes));
          const meta = await pipeline.metadata();
          if (meta.width && meta.height && (meta.width > targetDim || meta.height > targetDim)) {
            pipeline = pipeline.resize({
              width: targetDim,
              height: targetDim,
              fit: 'inside',
              withoutEnlargement: true,
            });
          }
          compBuf = await pipeline.jpeg({ quality: targetQuality, mozjpeg: true }).toBuffer();
        } catch (_) {}
      }
      // 2. FlateDecode (PNG / Deflated bitmap)
      else if (filter === '/FlateDecode' && width && height) {
        try {
          const inflated = zlib.inflateSync(Buffer.from(rawBytes));
          const decodeParms = dict.get(PDFName.of('DecodeParms'));
          const predictor = (decodeParms as any)?.get?.(PDFName.of('Predictor'))?.numberValue || 1;

          let channels: 1 | 2 | 3 | 4 = 3;
          if (colorSpace.includes('DeviceGray') || colorSpace.includes('CalGray')) {
            channels = 1;
          } else if (colorSpace.includes('DeviceCMYK')) {
            channels = 4;
          } else if (inflated.length === width * height * 4) {
            channels = 4;
          } else if (inflated.length === width * height) {
            channels = 1;
          }

          let pixelData: Buffer = Buffer.from(inflated);
          if (predictor >= 10 && predictor <= 15) {
            pixelData = unfilterPng(inflated, width, height, channels);
          }

          if (pixelData.length >= width * height * channels) {
            let pipeline = sharp(pixelData.subarray(0, width * height * channels), {
              raw: { width, height, channels },
            });

            if (width > targetDim || height > targetDim) {
              pipeline = pipeline.resize({
                width: targetDim,
                height: targetDim,
                fit: 'inside',
                withoutEnlargement: true,
              });
            }
            compBuf = await pipeline.jpeg({ quality: targetQuality, mozjpeg: true }).toBuffer();
          }
        } catch (_) {}
      }

      // Replace stream if compressed image is smaller than original
      if (compBuf && compBuf.length < rawBytes.length) {
        try {
          const meta = await sharp(compBuf).metadata();
          dict.set(PDFName.of('Width'), PDFNumber.of(meta.width || width));
          dict.set(PDFName.of('Height'), PDFNumber.of(meta.height || height));
          dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
          dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
          dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
          dict.delete(PDFName.of('DecodeParms'));

          const newStream = PDFRawStream.of(dict, new Uint8Array(compBuf));
          context.assign(ref, newStream);
          replacedImages++;
        } catch (_) {}
      }
    }

    const outBytes = await pdfDoc.save({ useObjectStreams: true });
    return {
      buffer: Buffer.from(outBytes),
      replacedImages,
    };
  } catch (err) {
    console.warn('Native PDF compression notice:', err);
    return null;
  }
}
