'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Sparkles, AlertCircle, Image as ImageIcon } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';
import { scrollToTool } from '@/lib/utils/scrollHelper';
import { getSafeImagePreview } from '@/lib/utils/previewHelper';

interface TransformToolProps {
  mode: 'rotate' | 'flip';
}

export default function TransformTool({ mode }: TransformToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [rotateAngle, setRotateAngle] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [origDimensions, setOrigDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    if (files.length > 0) {
      setIsPreviewLoading(true);
      getSafeImagePreview(files[0])
        .then((preview) => {
          if (!isCancelled) {
            setOriginalPreviewUrl(preview.previewUrl);
            setOrigDimensions({ width: preview.width, height: preview.height });
            setIsPreviewLoading(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error('Transform preview error:', err);
            try {
              const fallbackUrl = URL.createObjectURL(files[0]);
              setOriginalPreviewUrl(fallbackUrl);
            } catch {}
            setIsPreviewLoading(false);
          }
        });
    } else {
      setOriginalPreviewUrl(null);
      setOrigDimensions(null);
      setIsPreviewLoading(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [files]);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      if (rotateAngle !== 0) formData.append('rotateAngle', rotateAngle.toString());
      if (flipH) formData.append('flipHorizontal', 'true');
      if (flipV) formData.append('flipVertical', 'true');

      const res = await fetch('/api/transform-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Transformation failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error transforming image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setRotateAngle(0);
    setFlipH(false);
    setFlipV(false);
    scrollToTool();
  };

  return (
    <div className="w-full space-y-6">
      {files.length === 0 && (
        <UploadZone
          accept="image/*, .jpg, .jpeg, .jfif, .pjpeg, .pjp, .png, .webp, .avif, .bmp, .heic, .heif"
          files={files}
          onFilesSelected={setFiles}
          title={`Upload image to ${mode === 'rotate' ? 'rotate' : 'flip'}`}
          subtitle="Supports JPG, PNG, WebP, and camera formats"
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-base-200/60 border border-base-300 gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-base-200 border border-base-300 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative">
                {originalPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={originalPreviewUrl}
                    alt="Original thumb"
                    className="w-full h-full object-cover"
                  />
                ) : isPreviewLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-base-content/40" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-base-content truncate max-w-xs sm:max-w-md">
                  {files[0].name}
                </p>
                <div className="flex items-center gap-2 pt-0.5 text-xs text-base-content/60 flex-wrap">
                  <span>Size: <strong className="text-base-content font-mono">{formatBytes(files[0].size)}</strong></span>
                  {origDimensions && (
                    <span className="badge badge-sm badge-ghost text-[10px] font-mono">
                      {origDimensions.width} × {origDimensions.height} px
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="btn btn-ghost btn-xs text-base-content/60 hover:text-error"
            >
              Change File
            </button>
          </div>

          {/* Action Buttons */}
          <div className="p-5 rounded-2xl bg-base-200/40 border border-base-300 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 block">
              {mode === 'rotate' ? 'Select Rotation' : 'Select Flip Direction'}:
            </span>

            {mode === 'rotate' ? (
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setRotateAngle(90)}
                  className={`btn btn-md rounded-2xl gap-2 ${
                    rotateAngle === 90 ? 'btn-primary text-white' : 'btn-ghost bg-base-100 border border-base-300'
                  }`}
                >
                  <RotateCw className="w-4 h-4" />
                  90° Right
                </button>
                <button
                  type="button"
                  onClick={() => setRotateAngle(270)}
                  className={`btn btn-md rounded-2xl gap-2 ${
                    rotateAngle === 270 ? 'btn-primary text-white' : 'btn-ghost bg-base-100 border border-base-300'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  90° Left
                </button>
                <button
                  type="button"
                  onClick={() => setRotateAngle(180)}
                  className={`btn btn-md rounded-2xl gap-2 ${
                    rotateAngle === 180 ? 'btn-primary text-white' : 'btn-ghost bg-base-100 border border-base-300'
                  }`}
                >
                  <RotateCw className="w-4 h-4" />
                  180° Upside Down
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFlipH(!flipH);
                  }}
                  className={`btn btn-md rounded-2xl gap-2 ${
                    flipH ? 'btn-primary text-white' : 'btn-ghost bg-base-100 border border-base-300'
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4" />
                  Flip Horizontal (Mirror) {flipH ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFlipV(!flipV);
                  }}
                  className={`btn btn-md rounded-2xl gap-2 ${
                    flipV ? 'btn-primary text-white' : 'btn-ghost bg-base-100 border border-base-300'
                  }`}
                >
                  <FlipVertical className="w-4 h-4" />
                  Flip Vertical (Upside Down) {flipV ? '✓' : ''}
                </button>
              </div>
            )}
          </div>

          {/* Live Preview with CSS Transform */}
          {originalPreviewUrl ? (
            <div className="p-6 rounded-2xl bg-base-100 border border-base-300 flex items-center justify-center bg-transparency-grid overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={originalPreviewUrl}
                alt="Transform preview"
                className="max-h-[320px] object-contain transition-transform duration-300 rounded-lg shadow-md"
                style={{
                  transform: `rotate(${rotateAngle}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                }}
              />
            </div>
          ) : isPreviewLoading ? (
            <div className="p-12 rounded-2xl bg-base-100 border border-base-300 flex flex-col items-center justify-center gap-2 text-base-content/60">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs">Preparing image preview...</span>
            </div>
          ) : null}

          {error && (
            <div className="alert alert-error text-xs rounded-2xl py-3 shadow-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing}
            className="btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/20 gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Applying Transformation...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Apply & Download Image
              </>
            )}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="p-4 rounded-3xl bg-base-100 border border-base-300 flex items-center justify-center bg-transparency-grid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.dataUrl}
              alt="Transformed result"
              className="max-h-[380px] object-contain rounded-xl shadow-lg"
            />
          </div>

          <ResultCard
            originalSize={result.originalSize}
            newSize={result.compressedSize}
            filename={`transformed_${result.originalName}`}
            dataUrl={result.dataUrl}
            format={result.format}
            dimensions={{ width: result.width, height: result.height }}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
