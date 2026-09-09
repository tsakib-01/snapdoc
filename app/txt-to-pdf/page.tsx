import React from 'react';
import type { Metadata } from 'next';
import DocToPdfTool from '@/components/tools/DocToPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'TXT & Text to PDF Converter - Free Online PDF Generator',
  description: 'Convert plain text files or pasted text into styled, formatted PDF documents.',
};

export default function TxtToPdfPage() {
  const tool = {
    id: 'txt-to-pdf',
    name: 'TXT to PDF',
    slug: 'txt-to-pdf',
    description: 'Convert plain text files (.txt) or pasted raw text into clean, formatted PDF documents.',
    longDescription: 'Turn notes, code snippets, documentation, or meeting transcripts into high-quality PDF files with clean Helvetica typography and automatic word wrapping.',
    category: 'convert' as const,
    icon: 'FileCode',
    acceptedTypes: '.txt,.text,.md,.log',
    keywords: ['txt to pdf', 'text to pdf', 'convert text to pdf', 'notepad to pdf online'],
    features: [
      'Automatic word wrapping and page break pagination',
      'Supports file upload or direct text copy-paste',
      'Clean document margins and title headings',
      'Instant in-memory processing'
    ],
    howTo: [
      { step: '1', text: 'Upload your .txt file or paste your text into the box.' },
      { step: '2', text: 'Click "Convert to PDF" to generate the document.' },
      { step: '3', text: 'Download your finalized PDF.' }
    ],
    faqs: [
      {
        q: 'Can I convert long documents with many pages?',
        a: 'Yes! The converter automatically paginates and breaks long text across multiple pages seamlessly.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <DocToPdfTool initialFormat="txt" title="Convert TXT to PDF" />
    </ToolLayout>
  );
}
