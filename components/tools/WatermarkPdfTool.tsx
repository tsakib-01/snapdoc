'use client';

import React, { useState } from 'react';
import { Stamp, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight, Image } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { formatBytes } from '@/lib/utils/formatters';

export default function WatermarkPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState<string>('CONFIDENTIAL');
  const [opacity, setOpacity] = useState<number>(0.3);
  const [rotation, setRotation] = useState<number>(-45);
  const [color, setColor] = useState<string>('#666666');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', watermarkType);
      formData.append('text', text);
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

      setResultData({
        dataUrl: data.dataUrl,
        filename: data.filename,
        size: data.size,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error adding watermark.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImageFile(null);
    setResultData(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file && (
        <UploadZone
          accept="application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title="Upload PDF to Add Watermark"
          subtitle="Stamp high-visibility text or logo watermarks across every page of your PDF document."
          onFilesSelected={(files) => setFile(files[0])}
        />
      )}

      {file && !resultData && (
        <div className="p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Stamp className="w-5 h-5" />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-1 bg-base-200 rounded-2xl w-fit">
                <button
                  onClick={() => setWatermarkType('text')}
                  className={`btn btn-xs rounded-xl ${watermarkType === 'text' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Text Watermark
                </button>
                <button
                  onClick={() => setWatermarkType('image')}
                  className={`btn btn-xs rounded-xl ${watermarkType === 'image' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Image Logo
                </button>
              </div>

              {watermarkType === 'text' ? (
                <div className="space-y-3">
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
                <div className="space-y-2">
                  <label className="text-xs text-base-content/70 font-semibold">Upload Logo / Stamp Image</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="file-input file-input-bordered file-input-sm w-full rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
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

          <div className="flex justify-end pt-4 border-t border-base-200">
            <button
              onClick={handleProcess}
              disabled={processing}
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/20"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Stamping Watermark...</span>
                </>
              ) : (
                <>
                  <span>Apply Watermark</span>
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
            <h3 className="text-2xl font-extrabold text-base-content">Watermarked PDF Ready!</h3>
            <p className="text-xs text-base-content/60">{formatBytes(resultData.size)}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={resultData.dataUrl}
              download={resultData.filename}
              className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/25"
            >
              <Download className="w-4 h-4" />
              <span>Download Watermarked PDF</span>
            </a>
            <button onClick={handleReset} className="btn btn-ghost text-xs">
              Watermark Another PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
