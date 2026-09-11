import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import ExcelToPdfTool from '@/components/tools/ExcelToPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

const tool = getToolBySlug('excel-to-pdf')!;

export const metadata: Metadata = {
  title: 'Excel to PDF Converter - High-Precision Spreadsheets to PDF',
  description: 'Convert Excel spreadsheets (.xlsx, .xls) and CSV data tables into crisp, publication-grade PDF documents with auto-fit layout, colors, and orientation.',
  keywords: tool.keywords,
  alternates: {
    canonical: `https://snapdoc.app/${tool.slug}`,
  },
  openGraph: {
    title: `${tool.name} - SnapDoc Tools`,
    description: tool.description,
  },
};

export default function ExcelToPdfPage() {
  return (
    <ToolLayout tool={tool}>
      <ExcelToPdfTool
        title="Convert Excel to PDF"
        subtitle="Convert Excel spreadsheets & workbooks into crisp, publication-ready PDF documents."
      />
    </ToolLayout>
  );
}
