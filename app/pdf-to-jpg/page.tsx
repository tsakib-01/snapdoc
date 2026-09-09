import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import PdfToJpgTool from '@/components/tools/PdfToJpgTool';

const tool = getToolBySlug('pdf-to-jpg')!;

export const metadata: Metadata = {
  title: 'PDF to JPG Converter - Extract PDF Pages as High-Res Images Online',
  description: tool.description,
  keywords: tool.keywords,
  alternates: {
    canonical: `https://snapdoc.app/${tool.slug}`,
  },
  openGraph: {
    title: `${tool.name} - SnapDoc Tools`,
    description: tool.description,
  },
};

export default function PdfToJpgPage() {
  return (
    <ToolLayout tool={tool}>
      <PdfToJpgTool />
    </ToolLayout>
  );
}
