'use client';

import React, { useState } from 'react';
import { Crop, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ToolLayout from '@/components/ui/ToolLayout';
import { formatBytes } from '@/lib/utils/formatters';

export default function CropPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [margin, setMargin] = useState<number>(30);
  const [processing, setProcessing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = {
    id: 'crop-pdf',
    name: 'Crop PDF',
    slug: 'crop-pdf',
    description: 'Trim margins and crop page dimensions across all pages in your PDF document.',
    longDescription: 'Remove excess blank margins or trim outer boundaries uniformly across all pages of your PDF in seconds.',
    category: 'pdf' as const,
    icon: 'Crop',
    acceptedTypes: 'application/pdf',
    keywords: ['crop pdf', 'trim pdf margins', 'resize pdf pages', 'cut pdf margins'],
    features: [
      'Uniform margin trimming slider (0px - 100px)',
      'Adjusts PDF MediaBox and CropBox boundaries',
      'Lossless content preservation',
      'Zero storage guarantee'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'Select how many pixels of margin you want to trim.' },
      { step: '3', text: 'Click "Crop PDF" to download your trimmed document.' }
    ],
    faqs: [
      {
        q: 'Does cropping reduce PDF quality?',
        a: 'No! Cropping simply adjusts the visible page viewport boundaries without recompressing text or images.'
      }
    ]
  };

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'crop');
      formData.append('top', margin.toString());
      formData.append('right', margin.toString());
      formData.append('bottom', margin.toString());
      formData.append('left', margin.toString());

      const res = await fetch('/api/flatten-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to crop PDF.');
      }

      setResultData({
        dataUrl: data.dataUrl,
        filename: data.filename,
        size: data.size,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error cropping PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResultData(null);
    setError(null);
  };

  return (
    <ToolLayout tool={tool}>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {!file && (
          <UploadZone
            accept="application/pdf"
            maxFiles={1}
            maxSizeMb={50}
            title="Upload PDF to Crop Margins"
            subtitle="Trim outer page margins uniformly across your PDF document."
            onFilesSelected={(files) => setFile(files[0])}
          />
        )}

        {file && !resultData && (
          <div className="p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-base-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Crop className="w-5 h-5" />
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

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-base-content/70">
                <span>Margin Trim Amount</span>
                <span className="font-bold text-primary">{margin}px</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value))}
                className="range range-xs range-primary"
              />
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
                    <span>Cropping PDF...</span>
                  </>
                ) : (
                  <>
                    <span>Crop PDF Now</span>
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
              <h3 className="text-2xl font-extrabold text-base-content">Cropped PDF Ready!</h3>
              <p className="text-xs text-base-content/60">{formatBytes(resultData.size)}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={resultData.dataUrl}
                download={resultData.filename}
                className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/25"
              >
                <Download className="w-4 h-4" />
                <span>Download Cropped PDF</span>
              </a>
              <button onClick={handleReset} className="btn btn-ghost text-xs">
                Crop Another PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
