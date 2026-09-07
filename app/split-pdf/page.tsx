import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import SplitPdfTool from '@/components/tools/SplitPdfTool';

const tool = getToolBySlug('split-pdf')!;

export const metadata: Metadata = {
  title: 'Split PDF Pages Online Free - Extract Pages from PDF',
  description: tool.description,
  keywords: tool.keywords,
  alternates: {
    canonical: `https://filemint.app/${tool.slug}`,
  },
  openGraph: {
    title: `${tool.name} - FileMint Tools`,
    description: tool.description,
  },
};

export default function SplitPdfPage() {
  return (
    <ToolLayout tool={tool}>
      <SplitPdfTool />
    </ToolLayout>
  );
}
