import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import TargetCompressorTool from '@/components/tools/TargetCompressorTool';

const tool = getToolBySlug('compress-jpg')!;

export const metadata: Metadata = {
  title: 'Compress JPG / JPEG Images Online | Free & Fast',
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

export default function CompressJpgPage() {
  return (
    <ToolLayout tool={tool}>
      <TargetCompressorTool defaultTargetKb={100} />
    </ToolLayout>
  );
}
