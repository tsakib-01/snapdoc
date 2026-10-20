import React from 'react';
import type { Metadata } from 'next';
import TermsContent from '@/components/pages/TermsContent';

export const metadata: Metadata = {
  title: 'Terms of Service - JPGEASY',
  description: 'Terms and conditions for using JPGEASY online image and PDF tools.',
  alternates: {
    canonical: 'https://jpgeasy.com/terms',
  },
};

export default function TermsPage() {
  return <TermsContent />;
}

