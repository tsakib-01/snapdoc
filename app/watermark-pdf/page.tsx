import React from 'react';
import type { Metadata } from 'next';
import WatermarkPdfTool from '@/components/tools/WatermarkPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Watermark PDF Online - Add Text or Image Logo Watermark',
  description: 'Add custom text stamps or image logos to your PDF with adjustable transparency and rotation.',
};

export default function WatermarkPdfPage() {
  const tool = {
    id: 'watermark-pdf',
    name: 'Watermark PDF',
    slug: 'watermark-pdf',
    description: 'Add custom text stamps (like CONFIDENTIAL, DRAFT) or company image logos to your PDF.',
    longDescription: 'Protect your documents by stamping custom text or logos across every page with adjustable opacity and rotation angle.',
    category: 'pdf' as const,
    icon: 'Stamp',
    acceptedTypes: 'application/pdf',
    keywords: ['watermark pdf', 'add watermark to pdf', 'stamp pdf', 'confidential watermark'],
    features: [
      'Text watermarks with custom color & text',
      'Image logo watermark upload',
      'Adjustable transparency (opacity) and rotation angle',
      'Instant in-memory processing'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'Choose text or image watermark and customize opacity/rotation.' },
      { step: '3', text: 'Click "Apply Watermark" to download your stamped document.' }
    ],
    faqs: [
      {
        q: 'Will the watermark appear on every page?',
        a: 'Yes, the watermark is applied consistently across all pages of your PDF document.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <WatermarkPdfTool />
    </ToolLayout>
  );
}
