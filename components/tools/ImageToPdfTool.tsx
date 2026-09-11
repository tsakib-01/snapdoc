'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, FileText, Sparkles, AlertCircle, X, ArrowLeft, ArrowRight, Plus, RotateCcw } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

interface ImageToPdfToolProps {
  title?: string;
  subtitle?: string;
  accept?: string;
  fileTypeLabel?: string;
}

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

export default function ImageToPdfTool({
  title = 'Drop one or multiple images to convert to PDF',
  subtitle = 'Supports JPG, PNG, and WebP (Up to 30 images)',
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  fileTypeLabel = 'Image',
}: ImageToPdfToolProps = {}) {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'LETTER' | 'FIT'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('portrait');
  const [margin, setMargin] = useState<'none' | 'small' | 'large'>('small');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs when items change or unmount
  useEffect(() => {
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [items]);

  const handleFilesSelected = (newFiles: File[]) => {
    const newItems: ImageItem[] = newFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setItems(newItems);
  };

  const handleAddMoreFiles = (additionalFiles: File[]) => {
    const newItems: ImageItem[] = additionalFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setItems((prev) => [...prev, ...newItems].slice(0, 50));
  };

  const moveItem = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const toRemove = items[index];
    if (toRemove?.previewUrl) {
      URL.revokeObjectURL(toRemove.previewUrl);
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (items.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      items.forEach((item) => {
        formData.append('files', item.file);
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
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setResult(null);
    setError(null);
  };

  const totalOriginalSize = items.reduce((acc, it) => acc + it.file.size, 0);

  return (
    <div className="w-full space-y-6">
      {/* Upload Zone */}
      {items.length === 0 && (
        <UploadZone
          accept={accept}
          multiple={true}
          maxFiles={30}
          files={items.map((i) => i.file)}
          onFilesSelected={handleFilesSelected}
          title={title}
          subtitle={subtitle}
        />
      )}

      {items.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Bar with Sequence & Clear All */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-base-200/50 border border-base-300">
            <div>
              <span className="text-xs sm:text-sm font-bold text-base-content block">
                Arrange Image Sequence ({items.length} {fileTypeLabel}{items.length === 1 ? '' : 's'})
              </span>
              <span className="text-xs text-base-content/60">
                Total size: {formatBytes(totalOriginalSize)} • Drag or use arrows to reorder PDF pages
              </span>
            </div>
            <button
              onClick={handleReset}
              className="btn btn-ghost btn-xs sm:btn-sm text-base-content/60 hover:text-error gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>

          {/* Visual Image Thumbnail Preview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 p-1">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="group relative rounded-2xl bg-base-100 border-2 border-base-300 hover:border-primary/60 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
              >
                {/* Image Thumbnail Container */}
                <div className="h-32 sm:h-36 w-full bg-base-200/40 p-2 flex items-center justify-center relative overflow-hidden">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="h-full w-full object-contain drop-shadow-sm rounded-lg"
                  />

                  {/* Page Sequence Badge */}
                  <span className="absolute top-2 left-2 badge badge-sm bg-neutral/80 text-white backdrop-blur-sm font-bold text-[10px] shadow">
                    Page {idx + 1}
                  </span>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="absolute top-1.5 right-1.5 btn btn-circle btn-xs btn-error text-white opacity-80 hover:opacity-100 shadow transition-opacity"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Reordering Controls & Name */}
                <div className="p-2 bg-base-100 border-t border-base-200 flex items-center justify-between gap-1 text-xs">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, 'left')}
                    className="btn btn-ghost btn-xs btn-circle disabled:opacity-30"
                    title="Move Backward"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="min-w-0 flex-1 text-center px-1">
                    <p className="font-semibold text-base-content truncate text-[11px]" title={item.file.name}>
                      {item.file.name}
                    </p>
                    <p className="text-[10px] text-base-content/50">
                      {formatBytes(item.file.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => moveItem(idx, 'right')}
                    className="btn btn-ghost btn-xs btn-circle disabled:opacity-30"
                    title="Move Forward"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add More Images Card Button */}
            <div
              onClick={() => addMoreInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-base-300 hover:border-primary/60 hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center p-4 min-h-[160px] text-center transition-all group"
              title="Add more photos"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-inner">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-base-content">Add More Images</span>
              <span className="text-[10px] text-base-content/50 mt-0.5">JPG, PNG, WebP</span>
              <input
                ref={addMoreInputRef}
                type="file"
                accept={accept}
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    handleAddMoreFiles(Array.from(e.target.files));
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
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
                Convert {items.length} {fileTypeLabel}{items.length === 1 ? '' : 's'} to PDF
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
