'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, FileImage, FileText, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils/formatters';

interface UploadZoneProps {
  accept: string; // e.g. "image/jpeg,image/png" or "application/pdf"
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMb?: number;
  files?: File[];
  onFilesSelected: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
}

export default function UploadZone({
  accept,
  multiple = false,
  maxFiles = 10,
  maxSizeMb,
  files = [],
  onFilesSelected,
  onFileRemove,
  title = 'Drag & drop your files here',
  subtitle = 'or click to browse from your device',
  disabled = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = (selectedFiles: FileList | null) => {
    setErrorMessage(null);
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles: File[] = [];
    const isPdfOnly = accept.includes('pdf');

    for (let i = 0; i < selectedFiles.length; i++) {
      const f = selectedFiles[i];

      // Validate type
      if (isPdfOnly) {
        if (!f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf')) {
          setErrorMessage(`"${f.name}" is not a valid PDF file. Please upload PDF files only.`);
          return;
        }
      } else if (accept.includes('image')) {
        const isImg =
          f.type.startsWith('image/') ||
          /\.(jpe?g|png|webp|avif|bmp|tiff|gif)$/i.test(f.name);
        if (!isImg) {
          setErrorMessage(`"${f.name}" is not a supported image format. Please upload JPG, PNG, or WebP.`);
          return;
        }
      }

      // Validate size
      const defaultMaxSize = isPdfOnly ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
      const maxSize = maxSizeMb ? maxSizeMb * 1024 * 1024 : defaultMaxSize;
      if (f.size > maxSize) {
        setErrorMessage(`"${f.name}" exceeds the maximum allowed file size of ${formatBytes(maxSize)}.`);
        return;
      }

      newFiles.push(f);
      if (!multiple) break; // Only take first file if not multiple
    }

    if (multiple) {
      const combined = [...files, ...newFiles].slice(0, maxFiles);
      onFilesSelected(combined);
    } else {
      onFilesSelected(newFiles.slice(0, 1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="w-full space-y-4">
      {/* Drag and drop card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`upload-dropzone relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all cursor-pointer select-none text-center ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-base-300 bg-base-100 hover:border-primary/50 hover:bg-base-200/40'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-inner shadow-primary/20">
          <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-base-content">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-base-content/60 mt-1">
          {subtitle}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="btn btn-primary btn-sm rounded-xl px-5 shadow-sm font-semibold">
            Choose File{multiple ? 's' : ''}
          </span>
          <span className="text-[11px] text-base-content/50 px-2 py-1 bg-base-200 rounded-lg">
            {accept.includes('pdf') ? 'PDF up to 100MB' : 'JPG, PNG, WebP up to 50MB'}
          </span>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="alert alert-error text-xs rounded-2xl py-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="btn btn-ghost btn-xs btn-circle"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Multi-file list preview & reordering */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-base-content/70 font-semibold px-1">
            <span>Uploaded {files.length} {files.length === 1 ? 'file' : 'files'}</span>
            {multiple && files.length > 1 && (
              <span className="text-[11px] font-normal text-base-content/50">
                (Max {maxFiles} files)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between p-3 rounded-2xl bg-base-100 border border-base-300 shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center shrink-0">
                    {file.type.includes('pdf') ? (
                      <FileText className="w-4 h-4 text-red-500" />
                    ) : (
                      <FileImage className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className="overflow-hidden text-left">
                    <p className="text-xs font-semibold text-base-content truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-base-content/50">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>

                {onFileRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRemove(idx);
                    }}
                    className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error ml-2"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
