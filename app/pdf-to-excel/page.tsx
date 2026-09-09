import React from 'react';
import type { Metadata } from 'next';
import PdfToOfficeTool from '@/components/tools/PdfToOfficeTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'PDF to Excel / CSV Converter - Extract Tables from PDF',
  description: 'Extract tables, data, and rows from PDF documents into spreadsheet CSV and Excel format.',
};

export default function PdfToExcelPage() {
  const tool = {
    id: 'pdf-to-excel',
    name: 'PDF to Excel / CSV',
    slug: 'pdf-to-excel',
    description: 'Extract tabular data and text from PDF documents into spreadsheet-compatible CSV/Excel files.',
    longDescription: 'Extract tables, records, and text lines from your PDF documents into structured CSV files that open immediately in Microsoft Excel, Google Sheets, or Apple Numbers.',
    category: 'convert' as const,
    icon: 'FileSpreadsheet',
    acceptedTypes: 'application/pdf',
    keywords: ['pdf to excel', 'pdf to csv', 'extract table from pdf', 'pdf data extractor'],
    features: [
      'Extracts structured rows and columns from PDF',
      'Download as CSV compatible with Excel and Google Sheets',
      'Live text preview before downloading',
      'Zero permanent storage or data tracking'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document containing tabular data.' },
      { step: '2', text: 'Review the extracted data in the preview box.' },
      { step: '3', text: 'Click "Download Extracted EXCEL" to save your spreadsheet.' }
    ],
    faqs: [
      {
        q: 'Does it work with Excel and Google Sheets?',
        a: 'Yes, the exported CSV spreadsheet imports directly into Excel, Sheets, and Numbers without formatting issues.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <PdfToOfficeTool targetFormat="excel" title="Convert PDF to Excel / CSV" />
    </ToolLayout>
  );
}
