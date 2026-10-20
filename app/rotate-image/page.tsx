import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import TransformTool from '@/components/tools/TransformTool';

const tool = getToolBySlug('rotate-image')!;

export const metadata: Metadata = {
  title: 'Image Rotator - Rotate Images 90° or 180° Online',
  description: tool.description,
  keywords: tool.keywords,
  alternates: {
    canonical: `https://jpgeasy.com/${tool.slug}`,
  },
  openGraph: {
    title: `${tool.name} - JPGEASY Tools`,
    description: tool.description,
  },
};

export default function RotateImagePage() {
  return (
    <ToolLayout tool={tool}>
      <TransformTool mode="rotate" />
    </ToolLayout>
  );
}
