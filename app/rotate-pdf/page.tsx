import React from 'react';
import type { Metadata } from 'next';
import VisualPdfOrganizerTool from '@/components/tools/VisualPdfOrganizerTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Rotate PDF Pages Online - Rotate All or Individual Pages',
  description: 'Rotate PDF pages 90, 180, or 270 degrees with live visual page previews. Save and download permanently.',
};

export default function RotatePdfPage() {
  const tool = {
    id: 'rotate-pdf',
    name: 'Rotate PDF Pages',
    slug: 'rotate-pdf',
    description: 'Rotate individual pages or entire PDF documents with live thumbnail previews.',
    longDescription: 'Fix upside-down or sideways scans. Rotate specific pages 90° clockwise, counter-clockwise, or 180° with live visual feedback.',
    category: 'pdf' as const,
    icon: 'RotateCw',
    acceptedTypes: 'application/pdf',
    keywords: ['rotate pdf', 'turn pdf', 'rotate upside down pdf', 'rotate pdf pages online'],
    features: [
      'Visual thumbnail page picker',
      'Rotate individual pages or all pages at once',
      'Lossless rotation without quality degradation',
      '100% In-memory processing'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'Use the rotation buttons on page cards or top toolbar.' },
      { step: '3', text: 'Click "Finish" to download your permanently rotated PDF.' }
    ],
    faqs: [
      {
        q: 'Can I rotate only page 1 and leave the rest unchanged?',
        a: 'Yes! Hover over page 1 and click the rotate icon to adjust only that page.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <VisualPdfOrganizerTool initialMode="rotate" title="Rotate PDF Pages" />
    </ToolLayout>
  );
}
