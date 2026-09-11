import React from 'react';
import type { Metadata } from 'next';
import VisualPdfOrganizerTool from '@/components/tools/VisualPdfOrganizerTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Extract PDF Pages Online - Select & Save Specific Pages',
  description: 'Visually select and extract specific pages from your PDF file. Download as a single PDF or a ZIP archive.',
};

export default function ExtractPdfPagesPage() {
  const tool = {
    id: 'extract-pdf-pages',
    name: 'Extract PDF Pages',
    slug: 'extract-pdf-pages',
    description: 'Select and extract specific pages from a PDF with interactive visual thumbnail previews.',
    longDescription: 'Choose the exact pages you want to keep from your PDF with visual thumbnail cards. Export your extracted pages into a single new PDF document or download separate individual page PDFs.',
    category: 'pdf' as const,
    icon: 'Scissors',
    acceptedTypes: 'application/pdf',
    keywords: ['extract pdf pages', 'separate pdf', 'save specific pdf pages', 'split pdf visually'],
    features: [
      'Visual thumbnail page picker with zoom preview',
      'Batch selection: All, Odd, or Even pages',
      'Export as combined PDF or ZIP of separate pages',
      'Instant client-side rendering with no data retention'
    ],
    howTo: [
      { step: '1', text: 'Select or drop your PDF document.' },
      { step: '2', text: 'Click on page cards to select the pages you want to extract.' },
      { step: '3', text: 'Optionally toggle "Separate PDFs" if you want each page as its own file.' },
      { step: '4', text: 'Click "Finish" to download your extracted document.' }
    ],
    faqs: [
      {
        q: 'Can I extract non-consecutive pages?',
        a: 'Yes! You can click any combination of pages (e.g. Page 1, Page 4, Page 7) to extract only those pages into a new file.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <VisualPdfOrganizerTool initialMode="extract" title="Extract PDF Pages" />
    </ToolLayout>
  );
}
