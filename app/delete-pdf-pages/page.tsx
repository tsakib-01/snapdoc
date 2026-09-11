import React from 'react';
import type { Metadata } from 'next';
import VisualPdfOrganizerTool from '@/components/tools/VisualPdfOrganizerTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Delete PDF Pages Online - Remove Unwanted Pages',
  description: 'Visually select and remove unwanted or blank pages from any PDF document in seconds.',
};

export default function DeletePdfPagesPage() {
  const tool = {
    id: 'delete-pdf-pages',
    name: 'Delete PDF Pages',
    slug: 'delete-pdf-pages',
    description: 'Quickly remove unwanted or blank pages from your PDF with visual thumbnail selection.',
    longDescription: 'Select pages to delete or click the trash icon on individual thumbnail cards to instantly remove them from your PDF file.',
    category: 'pdf' as const,
    icon: 'Trash2',
    acceptedTypes: 'application/pdf',
    keywords: ['delete pdf pages', 'remove pages from pdf', 'cut pdf pages', 'delete blank pdf pages'],
    features: [
      'Interactive visual thumbnail selector',
      'One-click trash action on any page card',
      'Instant removal with zero quality loss',
      '100% In-memory processing and strict privacy'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'Click the trash icon on the pages you want to discard, or select multiple pages to delete.' },
      { step: '3', text: 'Click "Finish" to download your cleaned PDF.' }
    ],
    faqs: [
      {
        q: 'Does deleting pages reduce the PDF file size?',
        a: 'Yes, removing unwanted pages and content will noticeably decrease your total PDF file size.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <VisualPdfOrganizerTool initialMode="delete" title="Delete PDF Pages" />
    </ToolLayout>
  );
}
