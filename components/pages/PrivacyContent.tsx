'use client';

import React from 'react';
import { ShieldCheck, Lock, Trash2, EyeOff } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function PrivacyContent() {
  const { t, language } = useLanguage();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" />
          <span>{t('privacyZeroStorageGuarantee', 'Zero Permanent File Storage Guarantee')}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-base-content">
          {t('privacyPolicyTitle', 'Privacy Policy')}
        </h1>
        <p className="text-sm text-base-content/60">
          {t('lastUpdated', 'Last updated')}: {new Date().toLocaleDateString(language || 'en', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-base-100 border border-base-300 space-y-6 text-sm text-base-content/80 leading-relaxed shadow-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            {t('privacySec1Title', '1. In-Memory Processing Architecture')}
          </h2>
          <p>
            {t(
              'privacySec1P1',
              'SnapDoc is designed around a strict ephemeral in-memory architecture. When you upload an image or PDF document to any of our tools, the file is temporarily processed in volatile RAM buffers solely to perform the requested optimization, conversion, or transformation.'
            )}
          </p>
          <p>
            {t(
              'privacySec1P2',
              'We do NOT write your uploaded files to any permanent disk storage, cloud bucket (like AWS S3, Cloudinary, or Firebase), or persistent database (like MongoDB or PostgreSQL).'
            )}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-emerald-500" />
            {t('privacySec2Title', '2. Immediate File Destruction')}
          </h2>
          <p>
            {t(
              'privacySec2P1',
              'Once your processed file is returned to your web browser for preview and download, the temporary memory buffer is immediately reclaimed by the garbage collector. No copy or backup is retained.'
            )}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-violet-500" />
            {t('privacySec3Title', '3. No Account or Personal Information')}
          </h2>
          <p>
            {t(
              'privacySec3P1',
              'SnapDoc is completely free to use without creating an account, registering an email address, or submitting personal information. We do not track individual users across sessions.'
            )}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-base-content">
            {t('privacySec4Title', '4. Analytics & Cookies')}
          </h2>
          <p>
            {t(
              'privacySec4P1',
              'We may use minimal, privacy-friendly analytics and standard server telemetry to monitor website uptime, performance, and aggregate error rates. We do not sell user data or share document contents with third parties.'
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
