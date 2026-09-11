import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import ConverterTool from '@/components/tools/ConverterTool';

const tool = getToolBySlug('webp-to-png')!;

export const metadata: Metadata = {
  title: 'WebP to PNG Converter - Lossless Conversion with Transparency',
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

export default function WebpToPngPage() {
  return (
    <ToolLayout tool={tool}>
      <ConverterTool sourceFormat="webp" targetFormat="png" fixedTarget={true} />
    </ToolLayout>
  );
}
