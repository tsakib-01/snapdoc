import React from 'react';
import type { Metadata } from 'next';
import PdfScannerTool from '@/components/tools/PdfScannerTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Camera PDF Scanner - Scan Documents Online to PDF',
  description: 'Use your smartphone or webcam camera to scan receipts, book pages, and notes into multi-page PDF documents.',
};

export default function PdfScannerPage() {
  const tool = {
    id: 'pdf-scanner',
    name: 'Camera PDF Scanner',
    slug: 'pdf-scanner',
    description: 'Capture documents, receipts, and pages with your device camera and convert directly to PDF.',
    longDescription: 'Turn your computer webcam or smartphone browser into a document scanner. Snap multi-page photos and combine them into a single clean PDF document in seconds.',
    category: 'pdf' as const,
    badge: 'Camera',
    icon: 'Camera',
    acceptedTypes: 'image/*',
    keywords: ['pdf scanner', 'scan to pdf', 'camera to pdf', 'online document scanner', 'mobile pdf scan'],
    features: [
      'Live camera viewfinder with document alignment guide',
      'Multi-page scan capture and sequence ordering',
      'Automatic high-resolution PDF generation',
      'Works seamlessly on mobile and desktop browsers'
    ],
    howTo: [
      { step: '1', text: 'Click "Open Camera" and allow camera permissions.' },
      { step: '2', text: 'Align your document inside the viewfinder and click "Capture Page".' },
      { step: '3', text: 'Capture additional pages if needed, then click "Convert Scans to PDF".' }
    ],
    faqs: [
      {
        q: 'Does it work on mobile phones without an app?',
        a: 'Yes! It runs directly in Chrome, Safari, and Firefox on iOS and Android without downloading any app.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <PdfScannerTool />
    </ToolLayout>
  );
}
