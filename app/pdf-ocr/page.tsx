import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import PdfOcrTool from '@/components/tools/PdfOcrTool';

const tool = getToolBySlug('pdf-ocr') || {
  id: 'pdf-ocr',
  name: 'PDF OCR & Text Extractor',
  slug: 'pdf-ocr',
  description: 'Turn scanned, image-based PDFs into searchable, selectable PDFs and machine-readable text.',
  longDescription: 'Extract text layers and recognize characters from scanned PDF documents and image files directly in your browser. Generates 100% searchable PDFs with selectable text layers.',
  category: 'convert' as const,
  badge: 'OCR',
  icon: 'ScanText',
  acceptedTypes: 'application/pdf,image/*',
  keywords: ['pdf ocr', 'scanned pdf to text', 'searchable pdf', 'extract text from pdf', 'make pdf searchable'],
  features: [
    'Converts scanned picture PDFs into 100% searchable, selectable PDFs',
    'Extracts editable, machine-readable text with word & character counts',
    'Embeds invisible text layers at precise word coordinates',
    'One-click Copy to clipboard and .txt export',
    'Multi-language recognition (English, Spanish, French, German, etc.)',
    '100% private client-side processing with zero server uploads'
  ],
  howTo: [
    { step: '1', text: 'Upload your scanned PDF document or flat image pages.' },
    { step: '2', text: 'Select the recognition language and click "Start OCR".' },
    { step: '3', text: 'Download your Searchable PDF or copy the extracted text.' }
  ],
  faqs: [
    {
      q: 'What is a Searchable PDF?',
      a: 'A Searchable PDF keeps the exact visual appearance of your scanned document, but embeds an invisible layer of text over each word. This allows you to select text with your mouse, copy-paste sentences, search with Ctrl+F, and edit text.'
    },
    {
      q: 'Can this read scanned receipts, invoices, and photo documents?',
      a: 'Yes! The optical character recognition engine analyzes pixel patterns across high-resolution page renders to reconstruct characters into machine-readable text.'
    }
  ]
};

export const metadata: Metadata = {
  title: 'PDF OCR & Text Extractor - Convert Scanned PDF to Searchable Text',
  description: 'Turn image-based and scanned PDFs into searchable, selectable, and editable machine-readable text online for free.',
  alternates: {
    canonical: 'https://jpgeasy.com/pdf-ocr',
  },
};

export default function PdfOcrPage() {
  return (
    <ToolLayout tool={tool as any}>
      <PdfOcrTool />
    </ToolLayout>
  );
}
