'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, Image, Trash2, SwitchCamera, Upload } from 'lucide-react';
import { formatBytes } from '@/lib/utils/formatters';

export default function PdfScannerTool() {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [processing, setProcessing] = useState<boolean>(false);
  const [flash, setFlash] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Safely attach stream to video element whenever camera is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.play().catch((err) => {
        console.warn('Video autoPlay deferred:', err);
      });
    }
  }, [isCameraActive]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (fallbackErr) {
        // Fallback for desktop webcams that don't support facingMode constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not access camera. Please allow camera permissions in your browser or upload images directly.');
      setIsCameraActive(false);
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('Camera is still loading. Please wait a moment and try again.');
      return;
    }

    // Trigger visual shutter flash
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImages((prev) => [...prev, dataUrl]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
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
        <div className="space-y-6">
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

          {/* Camera Viewfinder & Upload Options */}
          {!isCameraActive ? (
            <div className="text-center py-10 px-4 space-y-5 rounded-2xl border-2 border-dashed border-base-300 bg-base-200/40">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="font-bold text-base sm:text-lg text-base-content">Ready to Scan Documents</h4>
                <p className="text-xs sm:text-sm text-base-content/60">Use your camera to capture pages, or select photos from your device library.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="btn btn-primary rounded-xl gap-2 shadow-lg shadow-primary/25 px-5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Open Camera</span>
                </button>
                <label className="btn btn-outline rounded-xl gap-2 cursor-pointer px-4">
                  <Upload className="w-4 h-4" />
                  <span>Upload Photos</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center shadow-xl border border-base-300">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Document Alignment Frame */}
                <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-white/60 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-white text-xs font-bold bg-black/60 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-md">
                    Align document inside frame
                  </span>
                </div>

                {/* Flip Camera Button */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  title="Switch Front/Back Camera"
                  className="absolute top-3 right-3 btn btn-circle btn-sm bg-black/60 hover:bg-black/80 text-white border-none backdrop-blur-md"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>

                {/* Visual Camera Shutter Flash */}
                {flash && (
                  <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200 pointer-events-none" />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="btn btn-primary rounded-full px-6 sm:px-8 gap-2 shadow-xl shadow-primary/30 font-bold"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Page ({capturedImages.length + 1})</span>
                </button>
                <label className="btn btn-ghost btn-sm gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Add from gallery</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="btn btn-ghost btn-sm text-base-content/70"
                >
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
        <div className="py-6 text-center space-y-6">
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
