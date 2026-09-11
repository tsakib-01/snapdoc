import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import VisualPdfOrganizerTool from '@/components/tools/VisualPdfOrganizerTool';

const tool = getToolBySlug('split-pdf')!;

export const metadata: Metadata = {
  title: 'Split PDF Pages Online Free - Visual Page Splitter',
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

export default function SplitPdfPage() {
  return (
    <ToolLayout tool={tool}>
      <VisualPdfOrganizerTool
        initialMode="split"
        title="Split PDF Pages Visually"
        description="Select split points between thumbnails, extract custom ranges, or split into separate documents with live visual page previews."
      />
    </ToolLayout>
  );
}
