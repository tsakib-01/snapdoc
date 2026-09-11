import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import ResizerTool from '@/components/tools/ResizerTool';

const tool = getToolBySlug('resize-image')!;

export const metadata: Metadata = {
  title: 'Image Resizer - Resize Images by Pixels or Percentage Online',
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

export default function ResizeImagePage() {
  return (
    <ToolLayout tool={tool}>
      <ResizerTool />
    </ToolLayout>
  );
}
