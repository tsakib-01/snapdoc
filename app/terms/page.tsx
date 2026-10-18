import React from 'react';
import type { Metadata } from 'next';
import TermsContent from '@/components/pages/TermsContent';

export const metadata: Metadata = {
  title: 'Terms of Service - SnapDoc',
  description: 'Terms and conditions for using SnapDoc online image and PDF tools.',
  alternates: {
    canonical: 'https://snapdoc.app/terms',
  },
};

export default function TermsPage() {
  return <TermsContent />;
}

