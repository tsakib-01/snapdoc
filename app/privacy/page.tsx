import React from 'react';
import type { Metadata } from 'next';
import PrivacyContent from '@/components/pages/PrivacyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy - 100% In-Memory Processing Guarantee',
  description: 'Learn about our strict zero file storage policy and privacy architecture.',
  alternates: {
    canonical: 'https://jpgeasy.com/privacy',
  },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}

