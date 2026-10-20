import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import FlattenPdfTool from '@/components/tools/FlattenPdfTool';

const tool = getToolBySlug('flatten-pdf')!;

export const metadata: Metadata = {
  title: 'Flatten PDF Online Free - Lock Forms, Annotations & Make Uneditable',
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

export default function FlattenPdfPage() {
  return (
    <ToolLayout tool={tool}>
      <FlattenPdfTool />
    </ToolLayout>
  );
}
