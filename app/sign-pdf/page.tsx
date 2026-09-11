import React from 'react';
import type { Metadata } from 'next';
import SignPdfTool from '@/components/tools/SignPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Sign PDF Online - Free Digital eSignature Tool',
  description: 'Draw, type, or upload your signature to sign PDF contracts and documents securely online for free.',
};

export default function SignPdfPage() {
  const tool = {
    id: 'sign-pdf',
    name: 'Sign PDF Online',
    slug: 'sign-pdf',
    description: 'Draw, type, or upload your electronic signature and stamp it securely onto your PDF.',
    longDescription: 'Sign contracts, agreements, and forms easily. Use our smooth drawing pad, type your name with an elegant handwriting font, or upload a transparent signature image.',
    category: 'pdf' as const,
    icon: 'PenTool',
    acceptedTypes: 'application/pdf',
    keywords: ['sign pdf', 'esign pdf', 'sign document online', 'electronic signature pdf', 'free pdf signer'],
    features: [
      'Draw smooth signatures with mouse or touchscreen',
      'Type signatures with stylish cursive calligraphy fonts',
      'Upload pre-existing signature images',
      '100% In-memory processing with zero document storage'
    ],
    howTo: [
      { step: '1', text: 'Upload the PDF document you want to sign.' },
      { step: '2', text: 'Draw your signature, type your name, or upload a signature image.' },
      { step: '3', text: 'Click "Sign & Finish" to download your signed PDF.' }
    ],
    faqs: [
      {
        q: 'Is this electronic signature legal?',
        a: 'Yes, electronic signatures created with standard tools are widely recognized for contracts and agreements under ESIGN and eIDAS guidelines for standard business transactions.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool} isWide={true} noCardWrapper={true}>
      <SignPdfTool />
    </ToolLayout>
  );
}
