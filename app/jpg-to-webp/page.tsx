import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import ConverterTool from '@/components/tools/ConverterTool';

const tool = getToolBySlug('jpg-to-webp')!;

export const metadata: Metadata = {
  title: 'JPG to WebP Converter - Next-Gen Web Compression',
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

export default function JpgToWebpPage() {
  return (
    <ToolLayout tool={tool}>
      <ConverterTool sourceFormat="jpg" targetFormat="webp" fixedTarget={true} />
    </ToolLayout>
  );
}
