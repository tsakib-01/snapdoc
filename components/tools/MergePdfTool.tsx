'use client';

import React, { useState } from 'react';
import { Loader2, Layers, MoveUp, MoveDown, X, FileText, Sparkles, AlertCircle } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ResultCard from '@/components/ui/ResultCard';
import { formatBytes } from '@/lib/utils/formatters';

export default function MergePdfTool() {
  const [files, setFiles] = useState<File[]>([]);
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
    if (files.length < 2) {
      setError('Please upload at least 2 PDF documents to merge.');
      return;
    }
    setError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch('/api/merge-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Merge failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while merging PDFs.');
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
      {files.length === 0 && (
        <UploadZone
          accept="application/pdf"
          multiple={true}
          maxFiles={20}
          files={files}
          onFilesSelected={setFiles}
          title="Drop multiple PDF files to merge"
          subtitle="Combine 2 to 20 documents into a single PDF"
        />
      )}

      {files.length > 0 && !result && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                PDF Documents ({files.length} Selected)
              </h4>
              <p className="text-xs text-base-content/50">Drag or use arrows to adjust merge order</p>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-xs text-base-content/60 hover:text-error">
              Clear All
            </button>
          </div>

          {/* List of PDFs */}
          <div className="space-y-2 max-h-80 overflow-y-auto p-1">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-base-200/50 border border-base-300 shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="overflow-hidden">
                    <p className="text-xs sm:text-sm font-bold text-base-content truncate">{file.name}</p>
                    <p className="text-[11px] text-base-content/50">{formatBytes(file.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveFile(idx, 'up')}
                    className="btn btn-ghost btn-xs btn-circle text-base-content/60"
                    title="Move Up"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === files.length - 1}
                    onClick={() => moveFile(idx, 'down')}
                    className="btn btn-ghost btn-xs btn-circle text-base-content/60"
                    title="Move Down"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
            disabled={isProcessing || files.length < 2}
            className="btn btn-primary btn-md sm:btn-lg rounded-2xl w-full text-white font-bold shadow-xl shadow-primary/20 gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Merging PDF Files...
              </>
            ) : (
              <>
                <Layers className="w-5 h-5" />
                Merge {files.length} PDF Documents
              </>
            )}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-base-200/50 border border-base-300 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base text-base-content">PDF Documents Merged Successfully</h4>
              <p className="text-xs text-base-content/60 mt-0.5">
                Total Pages: {result.pageCount} | Size: {formatBytes(result.fileSize)}
              </p>
            </div>
          </div>

          <ResultCard
            originalSize={totalOriginalSize}
            newSize={result.fileSize}
            filename="merged_document.pdf"
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
