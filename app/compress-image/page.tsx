import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import GeneralCompressorTool from '@/components/tools/GeneralCompressorTool';

const tool = getToolBySlug('compress-image')!;

export const metadata: Metadata = {
  title: 'Image Compressor - Compress JPG, PNG, and WebP Online',
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

export default function CompressImagePage() {
  return (
    <ToolLayout tool={tool}>
      <GeneralCompressorTool />
    </ToolLayout>
  );
}
