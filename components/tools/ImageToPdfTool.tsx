'use client';

import React, { useState } from 'react';
import { Loader2, FileText, ArrowUpDown, Sparkles, AlertCircle, X, MoveUp, MoveDown } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

interface ImageToPdfToolProps {
  title?: string;
  subtitle?: string;
  accept?: string;
  fileTypeLabel?: string;
}

export default function ImageToPdfTool({
  title = 'Drop one or multiple images to convert to PDF',
  subtitle = 'Supports JPG, PNG, and WebP (Up to 30 images)',
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  fileTypeLabel = 'Image',
}: ImageToPdfToolProps = {}) {
  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'LETTER' | 'FIT'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('portrait');
  const [margin, setMargin] = useState<'none' | 'small' | 'large'>('small');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newFiles.length) return;

    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIdx];
    newFiles[targetIdx] = temp;
    setFiles(newFiles);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('pageSize', pageSize);
      formData.append('orientation', orientation);
      formData.append('margin', margin);

      const res = await fetch('/api/image-to-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate PDF.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while creating PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
  };

  const totalOriginalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full space-y-6">
      {/* Upload Zone */}
      {files.length === 0 && (
        <UploadZone
          accept={accept}
          multiple={true}
          maxFiles={30}
          files={files}
          onFilesSelected={setFiles}
          title={title}
          subtitle={subtitle}
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Reordering and List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                Arrange Image Sequence ({files.length} Pages)
              </span>
              <button onClick={handleReset} className="btn btn-ghost btn-xs text-base-content/60 hover:text-error">
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-base-200/50 border border-base-300 shadow-sm"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-base-content truncate">{file.name}</p>
                      <p className="text-[11px] text-base-content/50">{formatBytes(file.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveFile(idx, 'up')}
                      className="btn btn-ghost btn-xs btn-circle text-base-content/60"
                      title="Move Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === files.length - 1}
                      onClick={() => moveFile(idx, 'down')}
                      className="btn btn-ghost btn-xs btn-circle text-base-content/60"
                      title="Move Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PDF Page Settings */}
          <div className="p-5 rounded-2xl bg-base-200/40 border border-base-300 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/70 block">
              PDF Page Layout Options
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Page Size */}
              <div>
                <label className="text-xs font-semibold text-base-content/70 mb-1 block">Page Size</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="select select-bordered select-sm w-full rounded-xl font-medium"
                >
                  <option value="A4">A4 (Standard 210 × 297 mm)</option>
                  <option value="LETTER">US Letter (8.5 × 11 in)</option>
                  <option value="FIT">Fit to Original Image Dimensions</option>
                </select>
              </div>

              {/* Orientation */}
              <div>
                <label className="text-xs font-semibold text-base-content/70 mb-1 block">Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  className="select select-bordered select-sm w-full rounded-xl font-medium"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                  <option value="auto">Auto (Match Image)</option>
                </select>
              </div>

              {/* Margin */}
              <div>
                <label className="text-xs font-semibold text-base-content/70 mb-1 block">Margin</label>
                <select
                  value={margin}
                  onChange={(e) => setMargin(e.target.value as any)}
                  className="select select-bordered select-sm w-full rounded-xl font-medium"
                >
                  <option value="none">No Margin (Full Bleed)</option>
                  <option value="small">Small Margin (Standard)</option>
                  <option value="large">Large Margin</option>
                </select>
              </div>
            </div>
          </div>

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
                Generating PDF Document...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Convert {files.length} {fileTypeLabel}{files.length === 1 ? '' : 's'} to PDF
              </>
            )}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-base-200/50 border border-base-300 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base text-base-content">PDF Document Created Successfully</h4>
              <p className="text-xs text-base-content/60 mt-0.5">
                Contains {result.pageCount} pages ({formatBytes(result.fileSize)})
              </p>
            </div>
          </div>

          <ResultCard
            originalSize={totalOriginalSize}
            newSize={result.fileSize}
            filename="converted_images.pdf"
            dataUrl={result.dataUrl}
            format="PDF"
            extraInfo={`${result.pageCount} Pages`}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
