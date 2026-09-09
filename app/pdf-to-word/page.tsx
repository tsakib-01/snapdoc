import React from 'react';
import type { Metadata } from 'next';
import PdfToOfficeTool from '@/components/tools/PdfToOfficeTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'PDF to Word Converter - Free Online PDF to DOC / DOCX',
  description: 'Convert PDF documents to editable Word (.doc) and Text format online for free without sign up.',
};

export default function PdfToWordPage() {
  const tool = {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    slug: 'pdf-to-word',
    description: 'Convert PDF documents into editable Word (.doc) and Text files.',
    longDescription: 'Extract text, paragraphs, and content from your PDF documents directly into downloadable Word files so you can edit and reuse text freely.',
    category: 'convert' as const,
    icon: 'FileText',
    acceptedTypes: 'application/pdf',
    keywords: ['pdf to word', 'convert pdf to word', 'pdf to doc', 'pdf to docx online', 'editable pdf'],
    features: [
      'Extracts selectable text and formatting from PDF',
      'Download as Word (.doc) or plain text (.txt)',
      'Direct copy-to-clipboard button',
      '100% In-memory processing with no signup required'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'View extracted text content in the editor.' },
      { step: '3', text: 'Select "Word" format and click Download.' }
    ],
    faqs: [
      {
        q: 'Can I edit the converted file in Microsoft Word or Google Docs?',
        a: 'Yes! The downloaded file can be opened and edited directly in Word, LibreOffice, or Google Docs.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <PdfToOfficeTool targetFormat="word" title="Convert PDF to Word" />
    </ToolLayout>
  );
}
