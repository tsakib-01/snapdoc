import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import ConverterTool from '@/components/tools/ConverterTool';

const tool = getToolBySlug('jpg-to-png')!;

export const metadata: Metadata = {
  title: 'JPG to PNG Converter - Convert JPG to Lossless PNG Online',
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

export default function JpgToPngPage() {
  return (
    <ToolLayout tool={tool}>
      <ConverterTool sourceFormat="jpg" targetFormat="png" fixedTarget={true} />
    </ToolLayout>
  );
}
