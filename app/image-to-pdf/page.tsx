import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import ImageToPdfTool from '@/components/tools/ImageToPdfTool';

const tool = getToolBySlug('image-to-pdf')!;

export const metadata: Metadata = {
  title: 'Image to PDF Converter - Convert Multiple Images to PDF Online Free',
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

export default function ImageToPdfPage() {
  return (
    <ToolLayout tool={tool}>
      <ImageToPdfTool />
    </ToolLayout>
  );
}
