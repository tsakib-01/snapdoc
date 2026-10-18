import React from 'react';
import type { Metadata } from 'next';
import AboutContent from '@/components/pages/AboutContent';

export const metadata: Metadata = {
  title: 'About Us - SnapDoc Image & PDF Tools',
  description: 'Learn more about SnapDoc, providing lightning-fast, privacy-first file utilities.',
  alternates: {
    canonical: 'https://snapdoc.app/about',
  },
};

export default function AboutPage() {
  return <AboutContent />;
}

