import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import ImageToPdfTool from '@/components/tools/ImageToPdfTool';

const tool = getToolBySlug('jpg-to-pdf')!;

export const metadata: Metadata = {
  title: 'JPG to PDF Converter - Combine JPGs into PDF Online Free',
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

export default function JpgToPdfPage() {
  return (
    <ToolLayout tool={tool}>
      <ImageToPdfTool
        title="Drop one or multiple JPG images to convert to PDF"
        subtitle="Supports JPG and JPEG photos (Up to 30 images)"
        accept="image/jpeg,image/jpg"
        fileTypeLabel="JPG"
      />
    </ToolLayout>
  );
}
