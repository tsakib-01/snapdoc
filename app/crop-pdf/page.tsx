import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import CropPdfTool from '@/components/tools/CropPdfTool';

const tool = getToolBySlug('crop-pdf')!;

export const metadata: Metadata = {
  title: 'Crop PDF Online Free - Trim PDF Margins',
  description: tool.description,
  keywords: tool.keywords,
  alternates: {
    canonical: `https://snapdoc.app/${tool.slug}`,
  },
  openGraph: {
    title: `${tool.name} - JPGEASY Tools`,
    description: tool.description,
  },
};

export default function CropPdfPage() {
  return (
    <ToolLayout tool={tool}>
      <CropPdfTool />
    </ToolLayout>
  );
}
