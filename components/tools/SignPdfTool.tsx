'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, Type, Upload, Eraser } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';

export default function SignPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [signMode, setSignMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState<string>('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef<boolean>(false);

  // Set up drawing canvas
  useEffect(() => {
    if (signMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signMode, file]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing.current && canvasRef.current) {
      isDrawing.current = false;
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setSignatureDataUrl(null);
  };

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      let finalSignature = signatureDataUrl;

      // If typed, render typed signature to an offscreen canvas
      if (signMode === 'type' && typedName) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 400;
        offCanvas.height = 120;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
          offCtx.font = 'italic 36px "Brush Script MT", cursive, sans-serif';
          offCtx.fillStyle = '#0f172a';
          offCtx.textAlign = 'center';
          offCtx.textBaseline = 'middle';
          offCtx.fillText(typedName, 200, 60);
          finalSignature = offCanvas.toDataURL('image/png');
        }
      }

      if (!finalSignature) {
        throw new Error('Please create or upload your signature first.');
      }

      // Send signature image to watermark/stamp engine on bottom right of the PDF
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');
      formData.append('opacity', '1.0');
      formData.append('rotation', '0');

      // Convert dataUrl to blob
      const resBlob = await fetch(finalSignature).then((r) => r.blob());
      formData.append('imageFile', resBlob, 'signature.png');

      const res = await fetch('/api/watermark-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to sign PDF.');
      }

      setResultData({
        dataUrl: data.dataUrl,
        filename: `${file.name.replace(/\.[^/.]+$/, '')}_signed.pdf`,
        size: data.size,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error signing PDF document.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResultData(null);
    setSignatureDataUrl(null);
    setTypedName('');
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file && (
        <UploadZone
          accept="application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title="Upload PDF to eSign"
          subtitle="Draw, type, or upload your signature and stamp it securely onto your PDF document in memory."
          onFilesSelected={(files) => setFile(files[0])}
        />
      )}

      {file && !resultData && (
        <div className="p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-base-content">{file.name}</h3>
                <p className="text-xs text-base-content/60">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm btn-circle">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Signature Mode Selector */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-1 bg-base-200 rounded-2xl w-fit">
              <button
                onClick={() => setSignMode('draw')}
                className={`btn btn-xs rounded-xl gap-1.5 ${signMode === 'draw' ? 'btn-primary' : 'btn-ghost'}`}
              >
                <PenTool className="w-3 h-3" />
                <span>Draw Signature</span>
              </button>
              <button
                onClick={() => setSignMode('type')}
                className={`btn btn-xs rounded-xl gap-1.5 ${signMode === 'type' ? 'btn-primary' : 'btn-ghost'}`}
              >
                <Type className="w-3 h-3" />
                <span>Type Name</span>
              </button>
              <button
                onClick={() => setSignMode('upload')}
                className={`btn btn-xs rounded-xl gap-1.5 ${signMode === 'upload' ? 'btn-primary' : 'btn-ghost'}`}
              >
                <Upload className="w-3 h-3" />
                <span>Upload Signature</span>
              </button>
            </div>

            {/* Draw Pad */}
            {signMode === 'draw' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-base-content/70">
                  <span>Draw your signature inside the box:</span>
                  <button onClick={clearCanvas} className="text-error font-medium hover:underline flex items-center gap-1">
                    <Eraser className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
                <div className="rounded-2xl border-2 border-dashed border-base-300 bg-base-200/40 p-2 flex justify-center">
                  <canvas
                    ref={canvasRef}
                    width={450}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="cursor-crosshair bg-base-100 rounded-xl shadow-inner w-full max-w-[450px]"
                  />
                </div>
              </div>
            )}

            {/* Type Signature */}
            {signMode === 'type' && (
              <div className="space-y-3">
                <label className="text-xs text-base-content/70 font-semibold">Type your Full Name:</label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="input input-bordered input-md w-full rounded-xl text-lg font-serif italic"
                />
                {typedName && (
                  <div className="p-6 rounded-2xl bg-base-200/50 border border-base-300 text-center font-serif italic text-3xl text-primary">
                    {typedName}
                  </div>
                )}
              </div>
            )}

            {/* Upload Signature */}
            {signMode === 'upload' && (
              <div className="space-y-3">
                <label className="text-xs text-base-content/70 font-semibold">Upload Signature Image (PNG/JPG):</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = () => setSignatureDataUrl(reader.result as string);
                      reader.readAsDataURL(f);
                    }
                  }}
                  className="file-input file-input-bordered file-input-sm w-full rounded-xl"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-error text-xs rounded-2xl">
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-base-200">
            <button
              onClick={handleProcess}
              disabled={processing || (signMode === 'draw' && !signatureDataUrl) || (signMode === 'type' && !typedName)}
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/20"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing Document...</span>
                </>
              ) : (
                <>
                  <span>Sign & Finish</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {resultData && (
        <div className="p-8 rounded-3xl bg-base-100 border border-base-300 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold text-base-content">Signed Document Ready!</h3>
            <p className="text-xs text-base-content/60">{formatBytes(resultData.size)}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={resultData.dataUrl}
              download={resultData.filename}
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/25"
            >
              <Download className="w-4 h-4" />
              <span>Download Signed PDF</span>
            </a>
            <button onClick={handleReset} className="btn btn-ghost text-xs">
              Sign Another Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
