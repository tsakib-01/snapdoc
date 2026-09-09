import React from 'react';
import type { Metadata } from 'next';
import DocToPdfTool from '@/components/tools/DocToPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Excel & CSV to PDF Converter - Convert Spreadsheets to PDF',
  description: 'Convert Excel spreadsheets and CSV data tables into beautifully formatted PDF documents online.',
};

export default function ExcelToPdfPage() {
  const tool = {
    id: 'excel-to-pdf',
    name: 'Excel / CSV to PDF',
    slug: 'excel-to-pdf',
    description: 'Convert Excel sheets and CSV tabular data into structured, readable PDF tables.',
    longDescription: 'Turn raw spreadsheet data, receipts, and table reports into clean, multi-page PDF documents with styled headers and organized columns.',
    category: 'convert' as const,
    icon: 'FileSpreadsheet',
    acceptedTypes: '.csv,.xlsx,.xls,.txt',
    keywords: ['excel to pdf', 'csv to pdf', 'spreadsheet to pdf', 'convert table to pdf'],
    features: [
      'Automatic column width and row height calculation',
      'Highlighted table header row and clean borders',
      'Supports pasted CSV rows or uploaded files',
      'Zero storage guarantee with instant download'
    ],
    howTo: [
      { step: '1', text: 'Upload your CSV or Excel file, or paste table data directly.' },
      { step: '2', text: 'Click "Convert to PDF" to generate the table layout.' },
      { step: '3', text: 'Download your PDF report.' }
    ],
    faqs: [
      {
        q: 'Will multi-page tables automatically format properly?',
        a: 'Yes, long tables are split cleanly across multiple PDF pages with consistent margins.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <DocToPdfTool initialFormat="csv" title="Convert Excel / CSV to PDF" />
    </ToolLayout>
  );
}
