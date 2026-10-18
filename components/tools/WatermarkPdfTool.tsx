'use client';

import React, { useState } from 'react';
import { Stamp, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, Eye, FileText } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { extractPdfThumbnails, PdfPageThumbnail } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { useProgressAction } from '@/lib/hooks/useProgressAction';
import ProcessingButton from '@/components/ui/ProcessingButton';

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16) / 255,
      g: parseInt(clean.substring(2, 4), 16) / 255,
      b: parseInt(clean.substring(4, 6), 16) / 255,
    };
  }
  return { r: 0.5, g: 0.5, b: 0.5 };
}

export default function WatermarkPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageThumbnail[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loadingThumbnails, setLoadingThumbnails] = useState<boolean>(false);

  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState<string>('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState<number>(48);
  const [opacity, setOpacity] = useState<number>(0.3);
  const [rotation, setRotation] = useState<number>(-45);
  const [color, setColor] = useState<string>('#666666');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const { isProcessing, progress, startProgress, finishProgress, resetProgress } = useProgressAction();
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResultData(null);
    setLoadingThumbnails(true);

    try {
      const { thumbnails } = await extractPdfThumbnails(selectedFile);
      setPages(thumbnails);
      setCurrentPage(1);
    } catch (err: any) {
      console.error(err);
      setError('Could not extract thumbnails. You can still apply watermarks.');
    } finally {
      setLoadingThumbnails(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setImageFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setImagePreviewUrl(url);
    } else {
      setImagePreviewUrl(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    startProgress();
    setError(null);

    try {
      // 1. Direct client-side processing using pdf-lib:
      // Instant, private, eliminates mobile "failed to fetch"
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pdfPages = pdfDoc.getPages();
      const op = opacity ?? 0.3;
      const rot = rotation ?? -45;

      if (watermarkType === 'image' && imageFile) {
        let embedImg;
        const imgBuffer = await imageFile.arrayBuffer();
        if (
          imageFile.type === 'image/jpeg' ||
          imageFile.name.toLowerCase().endsWith('.jpg') ||
          imageFile.name.toLowerCase().endsWith('.jpeg')
        ) {
          embedImg = await pdfDoc.embedJpg(imgBuffer);
        } else if (
          imageFile.type === 'image/png' ||
          imageFile.name.toLowerCase().endsWith('.png')
        ) {
          embedImg = await pdfDoc.embedPng(imgBuffer);
        } else {
          const imgBitmap = await createImageBitmap(imageFile);
          const canvas = document.createElement('canvas');
          canvas.width = imgBitmap.width;
          canvas.height = imgBitmap.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(imgBitmap, 0, 0);
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
          if (blob) {
            embedImg = await pdfDoc.embedPng(await blob.arrayBuffer());
          }
        }

        if (embedImg) {
          const pdfAngle = -rot;
          const rad = (pdfAngle * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);

          for (const page of pdfPages) {
            const { width, height } = page.getSize();
            const imgWidth = Math.min(width * 0.5, embedImg.width);
            const imgHeight = (imgWidth / embedImg.width) * embedImg.height;

            // Center of image:
            const cx = imgWidth / 2;
            const cy = imgHeight / 2;
            // Rotated offset from image origin to center
            const dx = cx * cos - cy * sin;
            const dy = cx * sin + cy * cos;

            page.drawImage(embedImg, {
              x: width / 2 - dx,
              y: height / 2 - dy,
              width: imgWidth,
              height: imgHeight,
              opacity: op,
              rotate: degrees(pdfAngle),
            });
          }
        }
      } else {
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const stampText = text || 'CONFIDENTIAL';
        const colorObj = parseHexColor(color || '#888888');
        const pdfAngle = -rot;
        const rad = (pdfAngle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        for (const page of pdfPages) {
          const { width, height } = page.getSize();
          let effectiveFontSize = fontSize || 48;
          let textWidth = font.widthOfTextAtSize(stampText, effectiveFontSize);
          const maxAllowedLength = Math.hypot(width, height) * 0.75;
          if (textWidth > maxAllowedLength) {
            effectiveFontSize = Math.floor(effectiveFontSize * (maxAllowedLength / textWidth));
            textWidth = font.widthOfTextAtSize(stampText, effectiveFontSize);
          }
          const textHeight = font.heightAtSize(effectiveFontSize);

          // Center of the text:
          const cx = textWidth / 2;
          const cy = textHeight * 0.35;
          const dx = cx * cos - cy * sin;
          const dy = cx * sin + cy * cos;

          page.drawText(stampText, {
            x: width / 2 - dx,
            y: height / 2 - dy,
            size: effectiveFontSize,
            font,
            color: rgb(colorObj.r, colorObj.g, colorObj.b),
            opacity: op,
            rotate: degrees(pdfAngle),
          });
        }
      }

      const watermarkedBytes = await pdfDoc.save();
      const blob = new Blob([watermarkedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const dataUrl = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      await finishProgress(() => {
        setResultData({
          dataUrl,
          filename: `${baseName}_watermarked.pdf`,
          size: blob.size,
        });
      });
    } catch (err: any) {
      console.warn('Client watermark fallback to API:', err);
      // Fallback to API if client-side has unexpected issue
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', watermarkType);
        formData.append('text', text);
        formData.append('fontSize', fontSize.toString());
        formData.append('opacity', opacity.toString());
        formData.append('rotation', rotation.toString());
        formData.append('color', color);

        if (watermarkType === 'image' && imageFile) {
          formData.append('imageFile', imageFile);
        }

        const res = await fetch('/api/watermark-pdf', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to watermark PDF.');
        }

        await finishProgress(() => {
          setResultData({
            dataUrl: data.dataUrl,
            filename: data.filename,
            size: data.size,
          });
        });
      } catch (apiErr: any) {
        resetProgress();
        setError(apiErr.message || err.message || 'Error adding watermark.');
      }
    }
  };

  const handleReset = () => {
    setFile(null);
    setPages([]);
    setCurrentPage(1);
    setImageFile(null);
    setImagePreviewUrl(null);
    setResultData(null);
    setError(null);
  };

  const activeThumbnail = pages[currentPage - 1];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {(!file || loadingThumbnails) && (
        <UploadZone
          accept=".pdf,application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title="Upload PDF to Add Watermark"
          subtitle="Stamp high-visibility text or logo watermarks across every page of your PDF document."
          onFilesSelected={(files) => handleFileSelected(files[0])}
          loading={loadingThumbnails}
          loadingMessage="Rendering document pages & initializing watermark studio..."
          files={file ? [file] : []}
        />
      )}

      {file && !loadingThumbnails && !resultData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Stamp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-base-content truncate max-w-[200px] sm:max-w-md">{file.name}</h3>
                <p className="text-xs text-base-content/60">{formatBytes(file.size)} • {pages.length} Pages</p>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm btn-circle" title="Reset">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Visual Page Preview with Live Watermark Overlay */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-base-200/50 p-4 sm:p-6 rounded-2xl border border-base-300">
              <div className="w-full flex items-center justify-between pb-3 text-xs font-bold text-base-content/70">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  Live Watermark Preview (Page {currentPage} of {pages.length || 1})
                </span>
                <span className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Real-time preview
                </span>
              </div>

              {activeThumbnail ? (
                <div
                  style={{ aspectRatio: `${activeThumbnail.aspectRatio}` }}
                  className="@container relative w-full max-w-[340px] sm:max-w-[400px] bg-white rounded-none shadow-lg border border-base-300 select-none my-2 flex items-center justify-center"
                >
                  <img
                    src={activeThumbnail.dataUrl}
                    alt={`Page ${currentPage}`}
                    className="w-full h-full object-contain pointer-events-none rounded-none"
                  />

                  {/* Live Watermark Overlay matching PDF Arial/Helvetica */}
                  {watermarkType === 'text' && text && (
                    <div
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        opacity: opacity,
                        color: color,
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        fontWeight: 700,
                        fontSize: `clamp(14px, ${(fontSize / 595) * 100}cqw, 72px)`,
                        letterSpacing: '0px',
                        lineHeight: 1,
                      }}
                      className="absolute font-bold text-center pointer-events-none select-none whitespace-nowrap"
                    >
                      {text}
                    </div>
                  )}

                  {watermarkType === 'image' && imagePreviewUrl && (
                    <img
                      src={imagePreviewUrl}
                      alt="Watermark Logo"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        opacity: opacity,
                      }}
                      className="absolute max-w-[50%] max-h-[50%] object-contain pointer-events-none select-none"
                    />
                  )}
                </div>
              ) : (
                <div className="w-full h-64 bg-base-100 rounded-xl border border-dashed border-base-300 flex items-center justify-center text-xs text-base-content/50">
                  <FileText className="w-8 h-8 opacity-40 mb-2 block" />
                  PDF Ready
                </div>
              )}

              {/* Page Thumbnails Selector Strip */}
              {pages.length > 1 && (
                <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 border-t border-base-200 mt-3">
                  {pages.map((pg) => (
                    <button
                      key={pg.pageNumber}
                      onClick={() => setCurrentPage(pg.pageNumber)}
                      className={`relative shrink-0 w-12 sm:w-14 rounded-lg p-1 border-2 transition-all ${
                        currentPage === pg.pageNumber ? 'border-primary bg-primary/10 scale-105' : 'border-base-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={pg.dataUrl} alt={`P${pg.pageNumber}`} className="w-full h-auto rounded-none object-contain bg-white" />
                      <span className="block text-[9px] font-bold text-center mt-0.5">{pg.pageNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Watermark Controls */}
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-1 bg-base-200 rounded-2xl w-fit">
                  <button
                    type="button"
                    onClick={() => setWatermarkType('text')}
                    className={`btn btn-sm h-auto min-h-[2rem] py-1.5 px-3 rounded-xl text-xs font-semibold leading-normal ${watermarkType === 'text' ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    Text Watermark
                  </button>
                  <button
                    type="button"
                    onClick={() => setWatermarkType('image')}
                    className={`btn btn-sm h-auto min-h-[2rem] py-1.5 px-3 rounded-xl text-xs font-semibold leading-normal ${watermarkType === 'image' ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    Image Logo
                  </button>
                </div>

                {watermarkType === 'text' ? (
                  <div className="space-y-3 p-4 rounded-2xl bg-base-200/40 border border-base-300">
                    <div className="space-y-1">
                      <label className="text-xs text-base-content/70 font-semibold">Watermark Text</label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="e.g. DRAFT, CONFIDENTIAL, SAMPLE"
                        className="input input-bordered input-sm w-full rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-base-content/70">
                        <span>Font Size</span>
                        <span className="font-bold text-primary">{fontSize} pt</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="80"
                        step="2"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="range range-xs range-primary"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-xs text-base-content/70 font-semibold">Text Color:</label>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-base-300"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 p-4 rounded-2xl bg-base-200/40 border border-base-300">
                    <label className="text-xs text-base-content/70 font-semibold">Upload Logo / Stamp Image</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleImageFileChange}
                      className="file-input file-input-bordered file-input-sm w-full rounded-xl"
                    />
                  </div>
                )}

                <div className="space-y-3 p-4 rounded-2xl bg-base-200/40 border border-base-300">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-base-content/70">
                      <span>Transparency / Opacity</span>
                      <span className="font-bold text-primary">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.9"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="range range-xs range-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-base-content/70">
                      <span>Stamp Rotation Angle</span>
                      <span className="font-bold text-primary">{rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      step="15"
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value))}
                      className="range range-xs range-primary"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="alert alert-error text-xs rounded-2xl">
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2">
                <ProcessingButton
                  onClick={handleProcess}
                  isProcessing={isProcessing}
                  progress={progress}
                  loadingLabel="Stamping Watermark"
                >
                  <Stamp className="w-4 h-4" />
                  <span>Apply Watermark</span>
                </ProcessingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {resultData && (
        <ResultCard
          newSize={resultData.size}
          originalSize={file?.size || resultData.size}
          filename={resultData.filename}
          dataUrl={resultData.dataUrl}
          format="PDF"
          title="Your watermark has been applied successfully!"
          subtitle="Your document has been protected with your watermark. You can now download your file below."
          resetLabel="Watermark Another PDF"
          extraInfo={pages.length > 0 ? `${pages.length} Pages` : undefined}
          pageCount={pages.length}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

