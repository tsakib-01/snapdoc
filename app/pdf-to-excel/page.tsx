import React from 'react';
import type { Metadata } from 'next';
import PdfToOfficeTool from '@/components/tools/PdfToOfficeTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'PDF to Excel Converter - High-Fidelity Table Extraction (.xlsx)',
  description: 'Convert PDF tables, invoices, statements, and spreadsheets into structured Excel (.xlsx) workbooks with exact cell background colors, borders, numbers, and multilingual text.',
  keywords: ['pdf to excel', 'pdf to xlsx', 'extract table from pdf', 'preserve table colors pdf to excel', 'bangla pdf to excel', 'pdf spreadsheet converter', 'financial statement pdf to excel'],
  alternates: {
    canonical: 'https://snapdoc.app/pdf-to-excel',
  },
  openGraph: {
    title: 'PDF to Excel Converter (.xlsx) - SnapDoc Tools',
    description: 'Convert PDF tables, invoices, and spreadsheets into structured Excel (.xlsx) workbooks.',
    url: 'https://snapdoc.app/pdf-to-excel',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF to Excel Converter (.xlsx) - SnapDoc Tools',
    description: 'Convert PDF tables, invoices, and spreadsheets into structured Excel (.xlsx) workbooks.',
  },
};

export default function PdfToExcelPage() {
  const tool = {
    id: 'pdf-to-excel',
    name: 'PDF to Excel (.xlsx)',
    slug: 'pdf-to-excel',
    description: 'Extract tables, data matrices, and multilingual text into structured Excel (.xlsx) spreadsheets.',
    longDescription: 'Extracts multi-page tables, financial reports, and data grids into beautifully styled Microsoft Excel (.xlsx) workbooks with preserved cell background fills, bold headers, numeric formatting, borders, and automatic column widths.',
    category: 'convert' as const,
    icon: 'FileSpreadsheet',
    acceptedTypes: 'application/pdf',
    keywords: [
      'pdf to excel',
      'pdf to xlsx',
      'extract table from pdf',
      'preserve table colors pdf to excel',
      'bangla pdf to excel',
      'pdf spreadsheet converter',
      'financial statement pdf to excel'
    ],
    features: [
      'Smart multi-page table and grid detection',
      'Preserves cell background fill colors, fonts, boldness, and alignments',
      'Extracts real numbers, currency amounts, and percentages into Excel formats',
      'Detects table borders and centers document titles without synthetic headers',
      'Auto-fits column widths for immediate readability',
      'Full Unicode, Bengali (বাংলা), and multilingual character support'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF containing tables, spreadsheets, or financial reports.' },
      { step: '2', text: 'The engine extracts structured grids, cell colors, font styles, and numbers.' },
      { step: '3', text: 'Click "Download Extracted Excel (.xlsx)" to save your clean spreadsheet.' }
    ],
    faqs: [
      {
        q: 'Are cell colors, borders, and headers preserved in Excel?',
        a: 'Yes! The converter samples exact cell colors from the PDF, detects table border strokes, and sets bold header typography in the generated Excel (.xlsx) sheet.'
      },
      {
        q: 'Does it format numbers as editable numbers instead of strings?',
        a: 'Yes, numeric values, prices, and currencies are converted to real numbers so you can immediately run formulas, sums, and pivot tables.'
      },
      {
        q: 'Does it handle multi-page PDF documents?',
        a: 'Yes, multi-page PDFs are neatly converted into organized sheets with auto-balanced column widths.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <PdfToOfficeTool targetFormat="excel" title="Convert PDF to Excel (.xlsx)" subtitle="Extract tables, cell colors, borders, numbers, and multilingual text into structured Excel spreadsheets." />
    </ToolLayout>
  );
}

