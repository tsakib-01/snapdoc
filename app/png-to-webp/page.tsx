import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import ConverterTool from '@/components/tools/ConverterTool';

const tool = getToolBySlug('png-to-webp')!;

export const metadata: Metadata = {
  title: 'PNG to WebP Converter - Shrink PNG with Full Transparency',
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

export default function PngToWebpPage() {
  return (
    <ToolLayout tool={tool}>
      <ConverterTool sourceFormat="png" targetFormat="webp" fixedTarget={true} />
    </ToolLayout>
  );
}
