import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import PdfToWordTool from '@/components/tools/PdfToWordTool';
import ToolLayout from '@/components/ui/ToolLayout';

const tool = getToolBySlug('pdf-to-word')!;

export const metadata: Metadata = {
  title: 'PDF to Word Converter - 100% Exact Typography & Layout (.docx)',
  description: 'Convert PDF documents to editable Microsoft Word (.docx) with 100% layout and font preservation, full Bangla & Indic conjunct support, tables, and images.',
  keywords: tool.keywords,
  alternates: {
    canonical: `https://snapdoc.app/${tool.slug}`,
  },
  openGraph: {
    title: `${tool.name} - SnapDoc Tools`,
    description: tool.description,
  },
};

export default function PdfToWordPage() {
  return (
    <ToolLayout tool={tool}>
      <PdfToWordTool
        title="Convert PDF to Word (.docx)"
        subtitle="Convert PDF to Word with 100% layout, font family, and multilingual precision."
      />
    </ToolLayout>
  );
}
