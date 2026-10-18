'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, Image, Trash2, SwitchCamera, Upload, Eye, X, ChevronLeft, ChevronRight, FlipHorizontal } from 'lucide-react';
import { formatBytes } from '@/lib/utils/formatters';
import ResultCard from '@/components/ui/ResultCard';
import { PDFDocument } from 'pdf-lib';
import { safeFetchJson } from '@/lib/utils/apiHelper';

export default function PdfScannerTool() {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
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
      let isDesktopFallback = false;
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
        isDesktopFallback = true;
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      // Automatically mirror front selfie camera or desktop webcam for natural reflection
      setIsMirrored(mode === 'user' || isDesktopFallback);

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
    setIsMirrored(nextMode === 'user');
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
      if (isMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
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
    if (previewImageIndex === index) {
      setPreviewImageIndex(null);
    } else if (previewImageIndex !== null && previewImageIndex > index) {
      setPreviewImageIndex(previewImageIndex - 1);
    }
  };

  const handleGeneratePdf = async () => {
    if (capturedImages.length === 0) return;

    setProcessing(true);
    setError(null);

    try {
      // 1. Direct client-side generation using pdf-lib:
      // Instant, private, eliminates mobile "failed to fetch" on camera photos
      const pdfDoc = await PDFDocument.create();

      for (const imgUrl of capturedImages) {
        const res = await fetch(imgUrl);
        const imgBytes = await res.arrayBuffer();

        let embedImg;
        try {
          embedImg = await pdfDoc.embedJpg(imgBytes);
        } catch {
          embedImg = await pdfDoc.embedPng(imgBytes);
        }

        const page = pdfDoc.addPage([embedImg.width, embedImg.height]);
        page.drawImage(embedImg, {
          x: 0,
          y: 0,
          width: embedImg.width,
          height: embedImg.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const dataUrl = URL.createObjectURL(blob);

      setResultData({
        dataUrl,
        filename: `scanned_doc_${Date.now()}.pdf`,
        size: blob.size,
      });
      stopCamera();
    } catch (err: any) {
      console.warn('Client scan generation fallback to API:', err);
      // Fallback to API if client-side has unexpected issue
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

        const data = await safeFetchJson(res);

        setResultData({
          dataUrl: data.dataUrl,
          filename: data.filename,
          size: data.size,
        });
        stopCamera();
      } catch (apiErr: any) {
        setError(apiErr.message || err.message || 'Error generating PDF from scans.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    stopCamera();
    setCapturedImages([]);
    setPreviewImageIndex(null);
    setResultData(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!resultData && (
        <div className="space-y-6">
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
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-base-300 w-fit mx-auto max-w-full max-h-[70vh] flex items-center justify-center bg-base-300/20">
                <video
                  ref={videoRef}
                  className={`max-h-[70vh] w-auto max-w-full block rounded-2xl ${isMirrored ? '-scale-x-100' : ''}`}
                  autoPlay
                  playsInline
                  muted
                />

                {/* Document Alignment Frame */}
                <div className="absolute inset-4 sm:inset-6 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="text-white text-xs font-bold bg-black/60 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-md">
                    Align document inside frame
                  </span>
                </div>

                {/* Camera Control Overlays (Top Right) */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                  {/* Mirror Reflection Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsMirrored((prev) => !prev)}
                    title={isMirrored ? 'Disable Mirror Reflection' : 'Enable Mirror Reflection'}
                    className={`btn btn-circle btn-sm ${isMirrored ? 'bg-primary text-white shadow-md' : 'bg-black/60 hover:bg-black/80 text-white'} border-none backdrop-blur-md`}
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>

                  {/* Flip Front/Back Camera Button */}
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    title="Switch Front/Back Camera"
                    className="btn btn-circle btn-sm bg-black/60 hover:bg-black/80 text-white border-none backdrop-blur-md"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </div>

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
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/70">
                  Scanned Pages ({capturedImages.length})
                </h4>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-ghost btn-xs text-base-content/60 hover:text-error gap-1"
                  title="Clear all pages"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {capturedImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setPreviewImageIndex(idx)}
                    className="relative group rounded-xl overflow-hidden border border-base-300 aspect-[1/1.3] bg-base-200 cursor-pointer hover:border-primary/60 hover:shadow-md transition-all"
                  >
                    <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="btn btn-circle btn-xs bg-black/60 text-white border-none shadow-sm">
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(idx);
                      }}
                      title="Delete Page"
                      className="absolute top-2 right-2 btn btn-circle btn-xs btn-error opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm z-10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold pointer-events-none">
                      Page {idx + 1}
                    </span>
                  </div>
                ))}
              </div>

              {/* Full Photo Preview Modal */}
              {previewImageIndex !== null && capturedImages[previewImageIndex] && (
                <div
                  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
                  onClick={() => setPreviewImageIndex(null)}
                >
                  <div
                    className="relative bg-base-100 rounded-3xl p-4 sm:p-5 max-w-2xl w-full max-h-[90vh] flex flex-col gap-3 shadow-2xl border border-base-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-base-200">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-sm badge-primary font-bold">
                          Page {previewImageIndex + 1} of {capturedImages.length}
                        </span>
                        <span className="text-xs text-base-content/60 hidden sm:inline">Preview Scanned Page</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {capturedImages.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPreviewImageIndex((prev) => (prev! > 0 ? prev! - 1 : capturedImages.length - 1))}
                              className="btn btn-ghost btn-xs btn-circle"
                              title="Previous Page"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewImageIndex((prev) => (prev! < capturedImages.length - 1 ? prev! + 1 : 0))}
                              className="btn btn-ghost btn-xs btn-circle"
                              title="Next Page"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(previewImageIndex)}
                          className="btn btn-ghost btn-xs text-error hover:bg-error/10 gap-1 rounded-lg"
                          title="Delete Page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-xs">Delete</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewImageIndex(null)}
                          className="btn btn-ghost btn-xs btn-circle"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Modal Image Viewport */}
                    <div className="flex-1 w-full bg-base-200/50 rounded-2xl overflow-hidden flex items-center justify-center p-2 min-h-[300px]">
                      <img
                        src={capturedImages[previewImageIndex]}
                        alt={`Scanned Page ${previewImageIndex + 1}`}
                        className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-sm"
                      />
                    </div>

                    {/* Modal Footer */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-base-content/50">
                        Check if text is sharp and clearly visible
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewImageIndex(null)}
                        className="btn btn-sm btn-ghost border border-base-300 rounded-xl px-4"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
        <ResultCard
          newSize={resultData.size}
          originalSize={resultData.size}
          filename={resultData.filename}
          dataUrl={resultData.dataUrl}
          format="PDF"
          title="Your scanned PDF is ready!"
          subtitle="Your camera scans and photos have been compiled into a clean PDF document."
          resetLabel="Scan Another Document"
          extraInfo={capturedImages.length > 0 ? `${capturedImages.length} Pages` : undefined}
          pageCount={capturedImages.length}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
