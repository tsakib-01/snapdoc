import React from 'react';
import type { Metadata } from 'next';
import DocToPdfTool from '@/components/tools/DocToPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Word / DOCX to PDF Converter - Free Online Tool',
  description: 'Convert Microsoft Word documents (.docx, .doc, .rtf) into professional PDF files online for free.',
};

export default function WordToPdfPage() {
  const tool = {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    slug: 'word-to-pdf',
    description: 'Convert Microsoft Word (.doc, .docx) and text documents into print-ready PDF files.',
    longDescription: 'Turn your Word documents into universally compatible, secure PDF files with preserved formatting, clean margins, and crisp text typography.',
    category: 'convert' as const,
    icon: 'FileText',
    acceptedTypes: '.doc,.docx,.rtf,.txt',
    keywords: ['word to pdf', 'convert word to pdf', 'docx to pdf', 'doc to pdf online'],
    features: [
      'Standard A4 and Letter layout rendering',
      'Clean typography and margin wrapping',
      'Zero formatting shift across devices',
      '100% In-memory processing with no account required'
    ],
    howTo: [
      { step: '1', text: 'Upload your Word document or text file.' },
      { step: '2', text: 'Click "Convert to PDF" to start processing.' },
      { step: '3', text: 'Download your finalized PDF document.' }
    ],
    faqs: [
      {
        q: 'Can anyone else see or store my uploaded Word document?',
        a: 'No, all conversions are executed in volatile memory buffers with zero permanent disk storage.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <DocToPdfTool initialFormat="word" title="Convert Word to PDF" />
    </ToolLayout>
  );
}
