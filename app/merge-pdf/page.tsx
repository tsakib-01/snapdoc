import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import MergePdfTool from '@/components/tools/MergePdfTool';

const tool = getToolBySlug('merge-pdf')!;

export const metadata: Metadata = {
  title: 'Merge PDF Files Online Free - Combine PDF Documents',
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

export default function MergePdfPage() {
  return (
    <ToolLayout tool={tool}>
      <MergePdfTool />
    </ToolLayout>
  );
}
