import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import TransformTool from '@/components/tools/TransformTool';

const tool = getToolBySlug('flip-image')!;

export const metadata: Metadata = {
  title: 'Image Flipper - Flip Images Horizontally and Vertically Online',
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

export default function FlipImagePage() {
  return (
    <ToolLayout tool={tool}>
      <TransformTool mode="flip" />
    </ToolLayout>
  );
}
