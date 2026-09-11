import React from 'react';
import type { Metadata } from 'next';
import PageNumbererTool from '@/components/tools/PageNumbererTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Add Page Numbers to PDF - Online PDF Numbering Tool',
  description: 'Easily insert page numbers into your PDF with custom placement, typography, and numbering formats.',
};

export default function AddPageNumbersPage() {
  const tool = {
    id: 'add-page-numbers-to-pdf',
    name: 'Add Page Numbers to PDF',
    slug: 'add-page-numbers-to-pdf',
    description: 'Insert page numbers into headers or footers with customizable format and placement.',
    longDescription: 'Number your PDF pages with ease. Choose your desired position (bottom center, top right, etc.), format ("Page 1 of N", "1 of N", or "1"), font size, and starting page offset.',
    category: 'pdf' as const,
    icon: 'Hash',
    acceptedTypes: 'application/pdf',
    keywords: ['add page numbers to pdf', 'number pdf pages', 'pdf pagination', 'page numbering online'],
    features: [
      '6 Visual placement positions: Top/Bottom, Left/Center/Right',
      'Flexible numbering styles: "Page X of Y", "X of Y", or "1, 2, 3..."',
      'Custom starting page and font sizing',
      'Instant in-memory stamping with no storage'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'Select your preferred position on the page (e.g. Bottom Center).' },
      { step: '3', text: 'Choose the numbering format and font size.' },
      { step: '4', text: 'Click "Add Page Numbers" to download your numbered PDF.' }
    ],
    faqs: [
      {
        q: 'Can I start numbering from page 2 (skipping cover page)?',
        a: 'Yes! Simply set "Start Numbering From Page" to 2 in the tool settings.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <PageNumbererTool />
    </ToolLayout>
  );
}
