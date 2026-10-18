'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function TermsContent() {
  const { t, language } = useLanguage();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-base-content">
          {t('termsOfServiceTitle', 'Terms of Service')}
        </h1>
        <p className="text-sm text-base-content/60">
          {t('lastUpdated', 'Last updated')}: {new Date().toLocaleDateString(language || 'en', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-base-100 border border-base-300 space-y-6 text-sm text-base-content/80 leading-relaxed shadow-sm">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-base-content">
            {t('termsSec1Title', '1. Acceptance of Terms')}
          </h2>
          <p>
            {t(
              'termsSec1P1',
              'By accessing or using SnapDoc, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use our services.'
            )}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-base-content">
            {t('termsSec2Title', '2. Permitted Use')}
          </h2>
          <p>
            {t(
              'termsSec2P1',
              'SnapDoc provides free image and PDF manipulation tools for personal, academic, and commercial purposes. You agree not to upload malicious software, illegal material, or use automated scrapers that excessively load our servers.'
            )}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-base-content">
            {t('termsSec3Title', '3. Disclaimer of Warranties')}
          </h2>
          <p>
            {t(
              'termsSec3P1',
              'The services are provided "as is" without warranty of any kind. While we strive for high conversion accuracy and file fidelity, SnapDoc is not liable for data loss or discrepancies in processed files. Always retain a local backup of your original files.'
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
