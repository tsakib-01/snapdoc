import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import CropperTool from '@/components/tools/CropperTool';

const tool = getToolBySlug('crop-image')!;

export const metadata: Metadata = {
  title: 'Image Cropper - Crop JPG, PNG, and WebP Online Free',
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

export default function CropImagePage() {
  return (
    <ToolLayout tool={tool}>
      <CropperTool />
    </ToolLayout>
  );
}
