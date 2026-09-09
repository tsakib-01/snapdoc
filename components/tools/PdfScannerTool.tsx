'use client';

import React, { useState, useRef } from 'react';
import { Camera, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, Image, Trash2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils/formatters';

export default function PdfScannerTool() {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error(err);
      setError('Could not access camera. Please allow camera permissions or upload images directly.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImages((prev) => [...prev, dataUrl]);
    }
  };

  const removePhoto = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePdf = async () => {
    if (capturedImages.length === 0) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < capturedImages.length; i++) {
        const resBlob = await fetch(capturedImages[i]).then((r) => r.blob());
        formData.append('files', resBlob, `scan_page_${i + 1}.jpg`);
      }
      formData.append('pageSize', 'A4');
      formData.append('margin', 'small');

      const res = await fetch('/api/image-to-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate scanned PDF.');
      }

      setResultData({
        dataUrl: data.dataUrl,
        filename: data.filename,
        size: data.size,
      });
      stopCamera();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating PDF from scans.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    stopCamera();
    setCapturedImages([]);
    setResultData(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!resultData && (
        <div className="p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-base-content">Camera Document Scanner</h3>
                <p className="text-xs text-base-content/60">Capture receipts, book pages, or contracts straight to PDF</p>
              </div>
            </div>
            {capturedImages.length > 0 && (
              <button onClick={handleReset} className="btn btn-ghost btn-sm btn-circle">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Camera Viewfinder */}
          {!isCameraActive ? (
            <div className="text-center py-10 space-y-4 rounded-2xl border-2 border-dashed border-base-300 bg-base-200/40">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Camera className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base">Ready to Scan Documents</h4>
                <p className="text-xs text-base-content/60">Use your device camera to scan pages in high resolution</p>
              </div>
              <button onClick={startCamera} className="btn btn-primary btn-sm rounded-xl gap-2">
                <Camera className="w-4 h-4" />
                <span>Open Camera</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center shadow-lg">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
                <div className="absolute inset-4 border-2 border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="text-white/70 text-xs font-semibold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                    Align document inside frame
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button onClick={capturePhoto} className="btn btn-primary rounded-full px-6 gap-2 shadow-lg shadow-primary/25">
                  <Camera className="w-4 h-4" />
                  <span>Capture Page ({capturedImages.length + 1})</span>
                </button>
                <button onClick={stopCamera} className="btn btn-ghost btn-sm">
                  Stop Camera
                </button>
              </div>
            </div>
          )}

          {/* Scanned Pages Gallery */}
          {capturedImages.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-base-200">
              <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/70">
                Scanned Pages ({capturedImages.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {capturedImages.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-base-300 aspect-[1/1.3] bg-base-200">
                    <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-2 right-2 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                      Page {idx + 1}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGeneratePdf}
                  disabled={processing}
                  className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/20"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating PDF...</span>
                    </>
                  ) : (
                    <>
                      <span>Convert Scans to PDF</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error text-xs rounded-2xl">
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {resultData && (
        <div className="p-8 rounded-3xl bg-base-100 border border-base-300 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold text-base-content">Scanned PDF Ready!</h3>
            <p className="text-xs text-base-content/60">{formatBytes(resultData.size)}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={resultData.dataUrl}
              download={resultData.filename}
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/25"
            >
              <Download className="w-4 h-4" />
              <span>Download Scanned PDF</span>
            </a>
            <button onClick={handleReset} className="btn btn-ghost text-xs">
              Scan Another Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
