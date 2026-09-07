import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import ImageToPdfTool from '@/components/tools/ImageToPdfTool';

const tool = getToolBySlug('jpg-to-pdf')!;

export const metadata: Metadata = {
  title: 'JPG to PDF Converter - Combine JPGs into PDF Online Free',
  description: tool.description,
  keywords: tool.keywords,
  alternates: {
    canonical: `https://filemint.app/${tool.slug}`,
  },
  openGraph: {
    title: `${tool.name} - FileMint Tools`,
    description: tool.description,
  },
};

export default function JpgToPdfPage() {
  return (
    <ToolLayout tool={tool}>
      <ImageToPdfTool />
    </ToolLayout>
  );
}
