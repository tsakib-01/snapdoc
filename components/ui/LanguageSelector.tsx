'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Globe, Check, ChevronUp, X } from 'lucide-react';
import {
  COLUMN_1_LANGUAGES,
  COLUMN_2_LANGUAGES,
  COLUMN_3_LANGUAGES,
  ALL_LANGUAGES,
  useLanguage,
  type SiteLanguage,
} from '@/lib/i18n/LanguageContext';

export { COLUMN_1_LANGUAGES, COLUMN_2_LANGUAGES, COLUMN_3_LANGUAGES, ALL_LANGUAGES };
export type { SiteLanguage };

export default function LanguageSelector() {
  const { language, setLanguage, currentLanguageObj, t } = useLanguage();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Cleanup any lingering legacy google translate cookies or elements if user had them previously
    try {
      const hostname = window.location.hostname;
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      document.cookie = `googtrans=; path=/; domain=${hostname}; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
      document.cookie = `googtrans=; path=/; domain=.${hostname}; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
      if (document.body.style.top && document.body.style.top !== '0px') {
        document.body.style.top = '0px';
      }
      const legacyScript = document.getElementById('google-translate-script');
      if (legacyScript) {
        legacyScript.remove();
      }
      const banner = document.querySelectorAll(
        '.goog-te-banner-frame, iframe.skiptranslate, body > .skiptranslate, body > div[class*="skiptranslate"]'
      );
      banner.forEach((b) => b.remove());
    } catch (_) {}
  }, []);

  // Handle click outside to close mega menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button replacing "Developed by Tasnim Sakib" */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-base-100 hover:bg-base-200 border border-base-300 shadow-2xs hover:border-primary/50 text-xs font-semibold text-base-content transition-all group"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-3.5 h-3.5 text-primary shrink-0 transition-transform group-hover:rotate-12" />
        <span>{mounted ? currentLanguageObj.nativeName : 'English'}</span>
        <ChevronUp
          className={`w-3.5 h-3.5 text-base-content/60 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 3-Column Mega Menu Popover (Opens Upward from Footer) */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-3 z-50 w-[92vw] sm:w-[580px] md:w-[660px] max-w-[96vw] bg-base-100 rounded-3xl border border-base-300 shadow-2xl p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
          role="dialog"
          aria-label="Language Selector Mega Menu"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-base-200">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="font-extrabold text-xs uppercase tracking-wider text-base-content">
                {t('selectLanguage', 'Select Your Language')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
              aria-label="Close language menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 3 Columns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-h-[60vh] sm:max-h-none overflow-y-auto sm:overflow-visible pr-1 sm:pr-0">
            {/* Column 1 */}
            <div className="flex flex-col space-y-1">
              {COLUMN_1_LANGUAGES.map((lang) => {
                const isSelected =
                  language === lang.code ||
                  (language === 'hi' && lang.code === 'hin') ||
                  (language === 'hin' && lang.code === 'hi');
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                        : 'text-base-content/80 hover:bg-base-200/70 hover:text-base-content font-medium'
                    }`}
                  >
                    <span className="w-4 flex items-center justify-center shrink-0">
                      {isSelected ? <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" /> : null}
                    </span>
                    <span className="truncate">{lang.nativeName}</span>
                  </button>
                );
              })}
            </div>

            {/* Column 2 */}
            <div className="flex flex-col space-y-1 border-t sm:border-t-0 sm:border-l border-base-200 pt-2 sm:pt-0 sm:pl-3">
              {COLUMN_2_LANGUAGES.map((lang) => {
                const isSelected =
                  language === lang.code ||
                  (language === 'hi' && lang.code === 'hin') ||
                  (language === 'hin' && lang.code === 'hi') ||
                  (language === 'bg' && lang.code === 'bul') ||
                  (language === 'ca' && lang.code === 'cat');
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                        : 'text-base-content/80 hover:bg-base-200/70 hover:text-base-content font-medium'
                    }`}
                  >
                    <span className="w-4 flex items-center justify-center shrink-0">
                      {isSelected ? <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" /> : null}
                    </span>
                    <span className="truncate">{lang.nativeName}</span>
                  </button>
                );
              })}
            </div>

            {/* Column 3 */}
            <div className="flex flex-col space-y-1 border-t sm:border-t-0 sm:border-l border-base-200 pt-2 sm:pt-0 sm:pl-3">
              {COLUMN_3_LANGUAGES.map((lang) => {
                const isSelected =
                  language === lang.code ||
                  (language === 'pl' && lang.code === 'pol') ||
                  (language === 'tr' && lang.code === 'tur') ||
                  (language === 'uk' && lang.code === 'ukr') ||
                  (language === 'vi' && lang.code === 'vie') ||
                  (language === 'sw' && lang.code === 'swa') ||
                  (language === 'bn' && lang.code === 'ben');
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                        : 'text-base-content/80 hover:bg-base-200/70 hover:text-base-content font-medium'
                    }`}
                  >
                    <span className="w-4 flex items-center justify-center shrink-0">
                      {isSelected ? <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" /> : null}
                    </span>
                    <span className="truncate">{lang.nativeName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
