import React from 'react';
import type { Metadata } from 'next';
import VisualPdfOrganizerTool from '@/components/tools/VisualPdfOrganizerTool';
import ToolLayout from '@/components/ui/ToolLayout';
import { TOOLS } from '@/lib/config/tools';

export const metadata: Metadata = {
  title: 'Organize PDF Pages Online - Visual Reorder, Delete & Rotate',
  description: 'View real-time page previews of your PDF to visually reorder, rotate, delete, or organize pages with zero uploads stored.',
};

export default function OrganizePdfPage() {
  const tool = TOOLS.find((t) => t.slug === 'organize-pdf') || {
    id: 'organize-pdf',
    name: 'Organize PDF Pages',
    slug: 'organize-pdf',
    description: 'Reorder, rotate, delete, and organize PDF pages visually with live thumbnail previews.',
    longDescription: 'Our visual PDF organizer renders interactive thumbnail previews of every page in your document. Easily drag to reorder, rotate individual pages, delete unwanted pages, and export your organized PDF.',
    category: 'pdf' as const,
    icon: 'Layers',
    acceptedTypes: 'application/pdf',
    keywords: ['organize pdf', 'reorder pdf pages', 'sort pdf', 'rotate pdf pages'],
    features: [
      'Live interactive thumbnail previews of all pages',
      'One-click multi-page rotation and deletion',
      'Batch selection: All, Odd, or Even pages',
      'Drag & drop page reordering',
      '100% In-memory processing with zero database storage'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'View all rendered page previews in the interactive workspace.' },
      { step: '3', text: 'Reorder, rotate, or delete pages as desired.' },
      { step: '4', text: 'Click "Finish" and download your organized PDF.' }
    ],
    faqs: [
      {
        q: 'Can I reorder pages in my PDF visually?',
        a: 'Yes! The visual organizer generates real-time thumbnails for each page, allowing you to move, rotate, and delete pages seamlessly.'
      },
      {
        q: 'Is my document private and secure?',
        a: 'Yes, page thumbnails are rendered on the client side in your browser, and file reorganization runs 100% in volatile memory.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <VisualPdfOrganizerTool initialMode="organize" />
    </ToolLayout>
  );
}
