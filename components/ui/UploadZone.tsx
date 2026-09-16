'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, FileImage, FileText, FileSpreadsheet, AlertCircle, X, CheckCircle2, Loader2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils/formatters';

function getFileStyle(filename: string = '', mimeType: string = '') {
  const lowerName = filename.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  // Excel / Spreadsheets: Green
  if (
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.csv') ||
    lowerMime.includes('spreadsheet') ||
    lowerMime.includes('excel') ||
    lowerMime.includes('csv')
  ) {
    return {
      icon: FileSpreadsheet,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      containerBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600',
    };
  }

  // Word Documents: Blue
  if (
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.rtf') ||
    lowerMime.includes('word') ||
    lowerMime.includes('officedocument.wordprocessingml')
  ) {
    return {
      icon: FileText,
      iconColor: 'text-blue-600 dark:text-blue-400',
      containerBg: 'bg-blue-500/15 border-blue-500/30 text-blue-600',
    };
  }

  // PDF Documents: Red
  if (lowerName.endsWith('.pdf') || lowerMime.includes('pdf')) {
    return {
      icon: FileText,
      iconColor: 'text-red-600 dark:text-red-400',
      containerBg: 'bg-red-500/15 border-red-500/30 text-red-600',
    };
  }

  // Default Image / Generic
  return {
    icon: FileImage,
    iconColor: 'text-blue-500',
    containerBg: 'bg-primary/10 border-primary/20 text-primary',
  };
}

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
  loading?: boolean;
  loadingMessage?: string;
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
  loading = false,
  loadingMessage,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingFileName, setLoadingFileName] = useState<string>('');
  const [loadingFileSize, setLoadingFileSize] = useState<number>(0);
  const [loadingFileType, setLoadingFileType] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || loading || internalLoading) return;
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

    if (newFiles.length === 0) return;

    const firstFile = newFiles[0];
    const isLarge = firstFile && firstFile.size > 1.5 * 1024 * 1024; // > 1.5MB

    setInternalLoading(true);
    setLoadingFileName(firstFile?.name || 'File');
    setLoadingFileSize(firstFile?.size || 0);
    setLoadingFileType(firstFile?.type || '');
    setLoadingProgress(25);

    setTimeout(() => setLoadingProgress(60), 120);
    setTimeout(() => setLoadingProgress(90), 280);
    setTimeout(() => {
      setLoadingProgress(100);
      setTimeout(() => {
        if (multiple) {
          const combined = [...files, ...newFiles].slice(0, maxFiles);
          onFilesSelected(combined);
        } else {
          onFilesSelected(newFiles.slice(0, 1));
        }
        setInternalLoading(false);
      }, 150);
    }, isLarge ? 550 : 320);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || loading || internalLoading) return;
    processFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const acceptLower = accept.toLowerCase();
  const isExcelDropzone =
    acceptLower.includes('spreadsheet') ||
    acceptLower.includes('excel') ||
    acceptLower.includes('csv') ||
    acceptLower.includes('.xlsx') ||
    acceptLower.includes('.xls');
  const isWordDropzone =
    acceptLower.includes('word') ||
    acceptLower.includes('docx') ||
    acceptLower.includes('.doc');
  const isPdfDropzone = acceptLower.includes('pdf');

  let dropzoneIconBg = 'bg-primary/10 text-primary shadow-primary/20';
  let DropzoneIcon = UploadCloud;

  if (isExcelDropzone) {
    dropzoneIconBg = 'bg-emerald-500/15 text-emerald-600 shadow-emerald-500/20';
    DropzoneIcon = FileSpreadsheet;
  } else if (isWordDropzone) {
    dropzoneIconBg = 'bg-blue-500/15 text-blue-600 shadow-blue-500/20';
    DropzoneIcon = FileText;
  } else if (isPdfDropzone) {
    dropzoneIconBg = 'bg-red-500/15 text-red-600 shadow-red-500/20';
    DropzoneIcon = FileText;
  }

  const showLoader = loading || internalLoading;
  const activeFileName = loadingFileName || (files[0]?.name) || '';
  const activeFileSize = loadingFileSize || (files[0]?.size) || 0;
  const activeFileType = loadingFileType || (files[0]?.type) || '';
  const activeStyle = getFileStyle(activeFileName, activeFileType || accept);
  const ActiveIcon = activeStyle.icon;
  const isLargeFile = activeFileSize > 3 * 1024 * 1024;

  return (
    <div className="w-full space-y-4">
      {/* Loading state or Drag and drop card */}
      {showLoader ? (
        <div className="relative flex flex-col items-center justify-center p-8 sm:p-12 md:p-14 rounded-2xl sm:rounded-3xl border-2 border-primary/40 bg-gradient-to-b from-primary/5 via-base-100 to-base-100 shadow-xl text-center overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Subtle ambient pulse background glow */}
          <div className="absolute w-80 h-80 rounded-full bg-primary/10 blur-3xl -top-24 -left-24 pointer-events-none animate-pulse" />
          <div className="absolute w-80 h-80 rounded-full bg-secondary/10 blur-3xl -bottom-24 -right-24 pointer-events-none animate-pulse" />

          {/* Center Animated Badge with Pulse Radar Ring */}
          <div className="relative mb-5">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl ${activeStyle.containerBg} flex items-center justify-center shadow-lg relative z-10 border`}>
              <ActiveIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${activeStyle.iconColor}`} />
            </div>
            <div className="absolute -inset-2 rounded-3xl border-2 border-primary/30 animate-ping opacity-30 pointer-events-none" />
          </div>

          {/* Title & Status */}
          <div className="space-y-1.5 max-w-md z-10">
            <h3 className="text-base sm:text-lg font-bold text-base-content flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-primary shrink-0" />
              <span>{loadingMessage || (isLargeFile ? 'Processing Large File...' : 'Reading & Preparing File...')}</span>
            </h3>

            {activeFileName && (
              <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                <span className="badge badge-primary badge-outline text-xs font-semibold max-w-[220px] sm:max-w-xs truncate">
                  {activeFileName}
                </span>
                {activeFileSize > 0 && (
                  <span className="badge badge-ghost text-xs font-mono font-bold">
                    {formatBytes(activeFileSize)}
                  </span>
                )}
                {isLargeFile && (
                  <span className="badge badge-warning text-[10px] font-bold">
                    Large Document
                  </span>
                )}
              </div>
            )}

            <p className="text-xs text-base-content/60 pt-1">
              {isLargeFile
                ? 'Large document detected. Optimizing and rendering high-resolution engine preview, please wait...'
                : 'Validating file format and initializing processing pipeline...'}
            </p>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full max-w-xs sm:max-w-sm mt-5 space-y-1.5 z-10">
            <div className="w-full bg-base-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-base-300">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${Math.min(loading ? 92 : loadingProgress, 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse" />
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-base-content/50 px-1">
              <span>Status: Active</span>
              <span>{loading ? '92%' : `${Math.round(loadingProgress)}%`}</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`upload-dropzone relative flex flex-col items-center justify-center p-5 sm:p-10 md:p-12 rounded-2xl sm:rounded-3xl border-2 border-dashed transition-all cursor-pointer select-none text-center ${
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

          <div className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl ${dropzoneIconBg} flex items-center justify-center mb-3 sm:mb-4 shadow-inner`}>
            <DropzoneIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 animate-pulse" />
          </div>

          <h3 className="text-sm sm:text-lg font-bold text-base-content">
            {title}
          </h3>
          <p className="text-[11px] sm:text-sm text-base-content/60 mt-1">
            {subtitle}
          </p>

          <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="btn btn-primary btn-sm rounded-xl px-4 sm:px-5 shadow-sm font-semibold text-xs sm:text-sm">
              Choose File{multiple ? 's' : ''}
            </span>
            <span className="text-[10px] sm:text-[11px] text-base-content/50 px-2 py-1 bg-base-200 rounded-lg">
              {accept.includes('pdf') ? 'PDF up to 100MB' : 'JPG, PNG, WebP up to 50MB'}
            </span>
          </div>
        </div>
      )}

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
            {files.map((file, idx) => {
              const fileStyle = getFileStyle(file.name, file.type);
              const FileItemIcon = fileStyle.icon;
              return (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-base-100 border border-base-300 shadow-sm"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${fileStyle.containerBg}`}>
                      <FileItemIcon className={`w-4 h-4 ${fileStyle.iconColor}`} />
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
