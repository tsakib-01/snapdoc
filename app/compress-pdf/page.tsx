import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import CompressPdfTool from '@/components/tools/CompressPdfTool';

const tool = getToolBySlug('compress-pdf')!;

export const metadata: Metadata = {
  title: 'Compress PDF Online Free - Reduce PDF File Size',
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

export default function CompressPdfPage() {
  return (
    <ToolLayout tool={tool}>
      <CompressPdfTool />
    </ToolLayout>
  );
}
