import React from 'react';
import type { Metadata } from 'next';
import DocToPdfTool from '@/components/tools/DocToPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'HTML to PDF Converter - Convert Web Snippets & Code to PDF',
  description: 'Convert HTML code snippets and web templates into formatted PDF documents online for free.',
};

export default function HtmlToPdfPage() {
  const tool = {
    id: 'html-to-pdf',
    name: 'HTML to PDF',
    slug: 'html-to-pdf',
    description: 'Convert HTML code, snippets, and markdown text into clean PDF files.',
    longDescription: 'Turn raw HTML content, web templates, or code documentation into printable PDF documents in seconds.',
    category: 'convert' as const,
    icon: 'FileCode',
    acceptedTypes: '.html,.htm,.txt',
    keywords: ['html to pdf', 'convert html to pdf', 'web page to pdf', 'code to pdf'],
    features: [
      'Strips tags or preserves code typography',
      'Clean PDF pagination and margins',
      'Instant client-side / in-memory compilation',
      'Zero storage guarantee'
    ],
    howTo: [
      { step: '1', text: 'Paste your HTML snippet or upload an HTML file.' },
      { step: '2', text: 'Click "Convert to PDF" to format the output.' },
      { step: '3', text: 'Download your PDF file.' }
    ],
    faqs: [
      {
        q: 'Can I convert raw HTML code directly without saving a file first?',
        a: 'Yes! Simply paste your HTML code into the text area and click convert.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <DocToPdfTool initialFormat="txt" title="Convert HTML to PDF" />
    </ToolLayout>
  );
}
