import React from 'react';
import type { Metadata } from 'next';
import WordToPdfTool from '@/components/tools/WordToPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Word to PDF Converter - Publication-Quality PDF (.docx to .pdf)',
  description: 'Convert Microsoft Word (.docx, .doc) documents into high-resolution, print-ready PDF files with exact typography, layouts, tables, and multilingual font rendering.',
  keywords: ['word to pdf', 'docx to pdf', 'convert word to pdf', 'bangla word to pdf', 'exact font word to pdf', 'high quality word to pdf', 'doc to pdf converter'],
  alternates: {
    canonical: 'https://snapdoc.app/word-to-pdf',
  },
  openGraph: {
    title: 'Word to PDF Converter - SnapDoc Tools',
    description: 'Convert Microsoft Word (.docx, .doc) documents into high-resolution, print-ready PDF files.',
    url: 'https://snapdoc.app/word-to-pdf',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word to PDF Converter - SnapDoc Tools',
    description: 'Convert Microsoft Word (.docx, .doc) documents into high-resolution, print-ready PDF files.',
  },
};

export default function WordToPdfPage() {
  const tool = {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    slug: 'word-to-pdf',
    description: 'Convert Microsoft Word (.docx, .doc) documents into publication-ready PDF with 100% typography fidelity.',
    longDescription: 'Converts Word (.docx / .doc) documents to crisp, high-resolution PDF files with exact font preservation (Calibri, Arial, Times New Roman, Segoe UI, Kalpurush, etc.), complex Indic & Bengali (বাংলা) ligature rendering, paragraph spacing, and embedded table borders.',
    category: 'convert' as const,
    icon: 'FileText',
    acceptedTypes: '.doc,.docx,.rtf,.txt',
    keywords: [
      'word to pdf',
      'docx to pdf',
      'convert word to pdf',
      'bangla word to pdf',
      'exact font word to pdf',
      'high quality word to pdf',
      'doc to pdf converter'
    ],
    features: [
      'High-fidelity typography rendering and font family preservation (Calibri, Arial, Times, Kalpurush, etc.)',
      'Preserves complex Indic & Bengali (বাংলা) ligatures and right-to-left scripts',
      'Preserves headers, footers, paragraph spacing, headings, and tables',
      'Zero layout shift across different operating systems and mobile devices',
      'Private on-device processing with zero data retention'
    ],
    howTo: [
      { step: '1', text: 'Upload your Word document (.docx, .doc) or RTF file.' },
      { step: '2', text: 'Click "Convert to PDF" to initiate high-precision typography rendering.' },
      { step: '3', text: 'Download your finalized, publication-ready PDF document.' }
    ],
    faqs: [
      {
        q: 'How does it guarantee font fidelity and prevent font substitution?',
        a: 'We utilize localized TrueType font matching and OpenXML typography parsing so font sizes, weights, and families match the original Word document.'
      },
      {
        q: 'Is there any watermark added to converted PDFs?',
        a: 'No, your PDFs are clean and unwatermarked with 100% original formatting.'
      },
      {
        q: 'Are my uploaded documents secure and private?',
        a: 'Yes, all conversions run locally in temporary memory buffers and are immediately removed after download.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <WordToPdfTool title="Convert Word to PDF" subtitle="Convert Word (.docx/.doc) documents into publication-ready PDF with 100% typography fidelity." />
    </ToolLayout>
  );
}

