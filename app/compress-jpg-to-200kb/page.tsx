import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ToolLayout from '@/components/ui/ToolLayout';
import TargetCompressorTool from '@/components/tools/TargetCompressorTool';

const tool = getToolBySlug('compress-jpg-to-200kb')!;

export const metadata: Metadata = {
  title: 'Compress JPG to 200KB Online Free',
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

export default function CompressJpgTo200KbPage() {
  return (
    <ToolLayout tool={tool}>
      <TargetCompressorTool defaultTargetKb={200} fixedTarget={true} />
    </ToolLayout>
  );
}
