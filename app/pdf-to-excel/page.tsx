import React from 'react';
import type { Metadata } from 'next';
import { getToolBySlug } from '@/lib/config/tools';
import PdfToExcelTool from '@/components/tools/PdfToExcelTool';
import ToolLayout from '@/components/ui/ToolLayout';

const tool = getToolBySlug('pdf-to-excel')!;

export const metadata: Metadata = {
  title: 'PDF to Excel Converter - High-Fidelity Table Extraction (.xlsx)',
  description: 'Convert PDF tables, invoices, statements, and spreadsheets into structured Excel (.xlsx) workbooks with exact cell background colors, borders, numbers, and multilingual text.',
  keywords: tool.keywords,
  alternates: {
    canonical: `https://snapdoc.app/${tool.slug}`,
  },
  openGraph: {
    title: `${tool.name} - SnapDoc Tools`,
    description: tool.description,
  },
};

export default function PdfToExcelPage() {
  return (
    <ToolLayout tool={tool}>
      <PdfToExcelTool
        title="Convert PDF to Excel (.xlsx)"
        subtitle="Extract tables, cell colors, borders, numbers, and multilingual text into structured Excel spreadsheets."
      />
    </ToolLayout>
  );
}
