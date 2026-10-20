import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'JPGEASY Guides – Image, PDF & Document Guides',
  description: 'Learn how to compress, convert, edit, and optimize your images, PDFs, and documents with step-by-step tutorials, practical tips, and FAQs.',
  alternates: {
    canonical: 'https://snapdoc.app/guides',
  },
  openGraph: {
    title: 'JPGEASY Guides – Image, PDF & Document Guides',
    description: 'Learn how to compress, convert, edit, and optimize your images, PDFs, and documents with step-by-step tutorials, practical tips, and FAQs.',
    url: 'https://snapdoc.app/guides',
    siteName: 'JPGEASY',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JPGEASY Guides – Image, PDF & Document Guides',
    description: 'Step-by-step tutorials and practical tips for compressing, converting, and editing images and PDFs.',
  },
};

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
