'use client';

import React, { useState } from 'react';
import { Layers, Download, Loader2, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import ToolLayout from '@/components/ui/ToolLayout';
import { formatBytes } from '@/lib/utils/formatters';

export default function FlattenPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    dataUrl: string;
    filename: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = {
    id: 'flatten-pdf',
    name: 'Flatten PDF',
    slug: 'flatten-pdf',
    description: 'Merge fillable form fields, annotations, and layers into an uneditable, secure PDF.',
    longDescription: 'Lock and secure your PDF forms and annotations by flattening all active interactive fields into a permanent, non-editable document layer.',
    category: 'pdf' as const,
    icon: 'Layers',
    acceptedTypes: 'application/pdf',
    keywords: ['flatten pdf', 'lock pdf form', 'make pdf uneditable', 'merge pdf layers'],
    features: [
      'Locks interactive form fields and signatures permanently',
      'Prevents unauthorized field modifications',
      'Optimizes document rendering across all PDF viewers',
      '100% In-memory processing'
    ],
    howTo: [
      { step: '1', text: 'Upload your interactive PDF or filled form.' },
      { step: '2', text: 'Click "Flatten PDF" to merge all interactive layers.' },
      { step: '3', text: 'Download your finalized, locked PDF.' }
    ],
    faqs: [
      {
        q: 'Why should I flatten a PDF?',
        a: 'Flattening prevents other people from editing fillable fields, checkboxes, or comments, making it safe for legal submission and archiving.'
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
      formData.append('action', 'flatten');

      const res = await fetch('/api/flatten-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to flatten PDF.');
      }

      setResultData({
        dataUrl: data.dataUrl,
        filename: data.filename,
        size: data.size,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error flattening PDF.');
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
            title="Upload PDF to Flatten Layers & Forms"
            subtitle="Lock all fillable form fields and annotations into static document pages."
            onFilesSelected={(files) => setFile(files[0])}
          />
        )}

        {file && !resultData && (
          <div className="p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-base-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Layers className="w-5 h-5" />
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

            <p className="text-xs text-base-content/70 leading-relaxed">
              Clicking <strong>Flatten PDF</strong> will permanently merge all interactive AcroForm fields, checkboxes, dropdowns, and digital annotations into the background layer.
            </p>

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
                    <span>Flattening PDF...</span>
                  </>
                ) : (
                  <>
                    <span>Flatten PDF Now</span>
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
              <h3 className="text-2xl font-extrabold text-base-content">Flattened PDF Ready!</h3>
              <p className="text-xs text-base-content/60">{formatBytes(resultData.size)}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={resultData.dataUrl}
                download={resultData.filename}
                className="btn btn-primary px-8 gap-2 shadow-lg shadow-primary/25"
              >
                <Download className="w-4 h-4" />
                <span>Download Flattened PDF</span>
              </a>
              <button onClick={handleReset} className="btn btn-ghost text-xs">
                Flatten Another PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
