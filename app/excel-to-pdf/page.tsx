import React from 'react';
import type { Metadata } from 'next';
import DocToPdfTool from '@/components/tools/DocToPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Excel to PDF Converter - High-Precision Spreadsheets to PDF',
  description: 'Convert Excel spreadsheets (.xlsx, .xls) and CSV data tables into crisp, publication-grade PDF documents with auto-fit layout, colors, and orientation.',
};

export default function ExcelToPdfPage() {
  const tool = {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    slug: 'excel-to-pdf',
    description: 'Convert Excel spreadsheets, multi-sheet workbooks, and financial tables to publication-quality PDF.',
    longDescription: 'Converts .xlsx, .xls, and .csv spreadsheets to print-ready PDF files with smart page orientation (portrait/landscape), auto-fit column widths, exact cell background fills, bold typography, borders, and full multilingual font support.',
    category: 'convert' as const,
    icon: 'FileSpreadsheet',
    acceptedTypes: '.xlsx,.xls,.csv',
    keywords: [
      'excel to pdf',
      'xlsx to pdf',
      'convert excel to pdf',
      'spreadsheet to pdf',
      'fit excel to pdf page',
      'preserve colors excel to pdf',
      'bangla excel to pdf'
    ],
    features: [
      'Auto-fit layout with intelligent landscape / portrait orientation selection',
      'Preserves exact cell colors, theme fills, bold typography, and custom borders',
      'Multi-sheet workbook support with seamless page breaks',
      'Preserves merged cells and document titles without synthetic headers',
      '100% Multilingual TrueType font rendering (Bangla, Hindi, Arabic, Chinese, Latin)',
      'Zero permanent storage with instantaneous local conversion'
    ],
    howTo: [
      { step: '1', text: 'Upload your Excel (.xlsx / .xls) spreadsheet or CSV file.' },
      { step: '2', text: 'The engine calculates column widths, cell fills, and optimal page orientation.' },
      { step: '3', text: 'Click "Convert to PDF" to download your print-ready document.' }
    ],
    faqs: [
      {
        q: 'Will wide tables get cut off?',
        a: 'No, wide tables (>6 columns) automatically switch to Landscape orientation with auto-balanced column widths to ensure complete data visibility.'
      },
      {
        q: 'Are custom cell background colors and styling preserved?',
        a: 'Yes, theme colors, tints, explicit hex fills, borders, and font weights are accurately translated into the final PDF.'
      },
      {
        q: 'Can I convert multi-sheet workbooks?',
        a: 'Yes, all sheets containing data are converted with clean page breaks between them.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <DocToPdfTool initialFormat="excel" title="Convert Excel to PDF" subtitle="Convert Excel spreadsheets & workbooks into crisp, publication-ready PDF documents." />
    </ToolLayout>
  );
}

