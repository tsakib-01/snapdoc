import React from 'react';
import type { Metadata } from 'next';
import PdfToWordTool from '@/components/tools/PdfToWordTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'PDF to Word Converter - 100% Exact Typography & Layout (.docx)',
  description: 'Convert PDF documents to editable Microsoft Word (.docx) with 100% layout and font preservation, full Bangla & Indic conjunct support, tables, and images.',
  keywords: ['pdf to word', 'convert pdf to word', 'pdf to docx', 'bangla pdf to word', 'exact layout pdf to word', 'multilingual pdf converter', 'editable word converter'],
  alternates: {
    canonical: 'https://snapdoc.app/pdf-to-word',
  },
  openGraph: {
    title: 'PDF to Word Converter (.docx) - SnapDoc Tools',
    description: 'Convert PDF documents to editable Microsoft Word (.docx) with 100% layout and font preservation.',
    url: 'https://snapdoc.app/pdf-to-word',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF to Word Converter (.docx) - SnapDoc Tools',
    description: 'Convert PDF documents to editable Microsoft Word (.docx) with 100% layout and font preservation.',
  },
};

export default function PdfToWordPage() {
  const tool = {
    id: 'pdf-to-word',
    name: 'PDF to Word (.docx)',
    slug: 'pdf-to-word',
    description: 'Convert PDF documents to editable Word (.docx) with 100% layout, font, and multilingual precision.',
    longDescription: 'Preserves typography, font families (Calibri, Arial, Segoe UI, Kalpurush, and 100+ fonts), complex Indic & Bengali (বাংলা) ligatures, two-column layouts, paragraphs, tables, borders, margins, and embedded images in standard Microsoft Word (.docx) format.',
    category: 'convert' as const,
    icon: 'FileText',
    acceptedTypes: 'application/pdf',
    keywords: [
      'pdf to word',
      'convert pdf to word',
      'pdf to docx',
      'bangla pdf to word',
      'exact layout pdf to word',
      'multilingual pdf converter',
      'editable word converter'
    ],
    features: [
      '100% Font & Typography Preservation (Calibri, Arial, Segoe UI, Kalpurush, and 100+ fonts)',
      'Complex Script & Bengali (বাংলা) ligature/conjunct support without broken glyphs',
      'Multi-column layout & header/footer flow reconstruction',
      'Preserves embedded high-resolution pictures, borders, and margins',
      'Exports directly to native Microsoft Word (.docx) format',
      '100% On-Device & Private in-memory conversion'
    ],
    howTo: [
      { step: '1', text: 'Upload or drop your PDF document.' },
      { step: '2', text: 'The engine analyzes fonts, multi-column blocks, complex scripts, and embedded tables.' },
      { step: '3', text: 'Click "Download Word (.docx)" to save your editable document with intact formatting.' }
    ],
    faqs: [
      {
        q: 'Will Bangla, Hindi, and other complex scripts render correctly without broken letters?',
        a: 'Yes! Our dedicated Unicode reordering and TrueType font styling engine ensures Bangla (বাংলা), Hindi, Arabic, and 100+ languages render perfectly with intact conjuncts (যুক্তবর্ণ).'
      },
      {
        q: 'Does this preserve multi-column question papers and layouts?',
        a: 'Yes, two-column layouts, question sets, tables, and centered headers are automatically detected and reconstructed into clean Word tables and margins.'
      },
      {
        q: 'Can I edit the generated .docx file in Microsoft Word and Google Docs?',
        a: 'Yes, the resulting file is a standard Microsoft Word (.docx) document compatible with Word, Google Docs, Apple Pages, and LibreOffice.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <PdfToWordTool title="Convert PDF to Word (.docx)" subtitle="Convert PDF to Word with 100% layout, font family, and multilingual precision." />
    </ToolLayout>
  );
}

