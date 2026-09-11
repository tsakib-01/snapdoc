import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import WordToPdfTool from '@/components/tools/WordToPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

const tool = getToolBySlug('word-to-pdf')!;

export const metadata: Metadata = {
  title: 'Word to PDF Converter - Publication-Quality PDF (.docx to .pdf)',
  description: 'Convert Microsoft Word (.docx, .doc) documents into high-resolution, print-ready PDF files with exact typography, layouts, tables, and multilingual font rendering.',
  keywords: tool.keywords,
  alternates: {
    canonical: `https://snapdoc.app/${tool.slug}`,
  },
  openGraph: {
    title: `${tool.name} - SnapDoc Tools`,
    description: tool.description,
  },
};

export default function WordToPdfPage() {
  return (
    <ToolLayout tool={tool}>
      <WordToPdfTool
        title="Convert Word to PDF"
        subtitle="Convert Word (.docx/.doc) documents into publication-ready PDF with 100% typography fidelity."
      />
    </ToolLayout>
  );
}
