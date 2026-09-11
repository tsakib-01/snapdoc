import React from 'react';
import type { Metadata } from 'next';
import PdfToOfficeTool from '@/components/tools/PdfToOfficeTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'PDF OCR & Text Extractor - Convert Scanned PDF to Text',
  description: 'Extract text, numbers, and data from scanned PDFs online for free with optical character recognition.',
};

export default function PdfOcrPage() {
  const tool = {
    id: 'pdf-ocr',
    name: 'PDF OCR & Text Extractor',
    slug: 'pdf-ocr',
    description: 'Extract readable and selectable text from scanned PDF documents.',
    longDescription: 'Extract text layers and recognize characters from scanned PDF documents and image files directly in memory.',
    category: 'convert' as const,
    badge: 'OCR',
    icon: 'ScanText',
    acceptedTypes: 'application/pdf',
    keywords: ['pdf ocr', 'scanned pdf to text', 'extract text from pdf', 'searchable pdf'],
    features: [
      'Extracts text streams and embedded character data',
      'Download as .txt or .doc Word file',
      'One-click Copy to clipboard',
      'Zero storage guarantee'
    ],
    howTo: [
      { step: '1', text: 'Upload your scanned PDF document.' },
      { step: '2', text: 'View the recognized text in the editor.' },
      { step: '3', text: 'Copy text or download as a text/word file.' }
    ],
    faqs: [
      {
        q: 'How does this OCR extractor work?',
        a: 'It scans the underlying character streams and fonts embedded in your PDF document to reconstruct the plain text.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <PdfToOfficeTool targetFormat="ocr" title="PDF OCR Text Extractor" />
    </ToolLayout>
  );
}
