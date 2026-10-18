'use client';

import React from 'react';
import { Sparkles, ShieldCheck, Zap, Heart } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function AboutContent() {
  const { t } = useLanguage();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-3 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-base-content">
          {t('aboutTitle', 'About SnapDoc')}
        </h1>
        <p className="text-base text-base-content/70 leading-relaxed max-w-2xl">
          {t('aboutSubtitle', 'SnapDoc was created to eliminate bloated, ad-ridden, privacy-invasive file converters.')}
        </p>
      </div>

      <div className="p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-6 text-sm text-base-content/80 leading-relaxed">
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('ourMission', 'Our Mission')}
          </h2>
          <p>
            {t(
              'aboutMission1',
              'Every day, millions of students, job seekers, and professionals need to compress a photo to 10KB for an official government application form, merge PDF contracts, or convert image formats. Most existing online tools are slow, enforce watermarks, require account registration, or store your private files on unknown remote servers.'
            )}
          </p>
          <p>
            {t(
              'aboutMission2',
              'SnapDoc changes that by providing a completely free, zero-storage, in-memory tool suite that runs at native machine speed.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-base-200">
          <div className="p-4 rounded-2xl bg-base-200/50 space-y-1">
            <h3 className="font-bold text-base-content text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              {t('privacyTitle', '100% Private')}
            </h3>
            <p className="text-xs text-base-content/60">
              {t('privacyDesc', 'Zero disk storage, zero database, instant memory disposal.')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-base-200/50 space-y-1">
            <h3 className="font-bold text-base-content text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-primary" />
              {t('fastTitle', 'Instant Speed')}
            </h3>
            <p className="text-xs text-base-content/60">
              {t('fastDesc', 'Engineered with high-speed performance architecture.')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-base-200/50 space-y-1">
            <h3 className="font-bold text-base-content text-sm flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-pink-500" />
              {t('freeTitle', 'No Hidden Fees')}
            </h3>
            <p className="text-xs text-base-content/60">
              {t('freeDesc', 'No subscription paywalls, no watermark, free forever.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
