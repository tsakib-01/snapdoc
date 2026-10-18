'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Globe, Check, ChevronUp, X } from 'lucide-react';

export interface SiteLanguage {
  code: string;
  name: string;
  nativeName: string;
}

// 27 languages matching the exact 3-column structure (9 per column)
export const COLUMN_1_LANGUAGES: SiteLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
];

export const COLUMN_2_LANGUAGES: SiteLanguage[] = [
  { code: 'zh-CN', name: 'Chinese Simplified', nativeName: '中文 (简体)' },
  { code: 'zh-TW', name: 'Chinese Traditional', nativeName: '中文 (繁體)' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'cat', name: 'Catalan', nativeName: 'Català' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'hin', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];

export const COLUMN_3_LANGUAGES: SiteLanguage[] = [
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'pol', name: 'Polish', nativeName: 'Polski' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย' },
  { code: 'tur', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
];

export const ALL_LANGUAGES: SiteLanguage[] = [
  ...COLUMN_1_LANGUAGES,
  ...COLUMN_2_LANGUAGES,
  ...COLUMN_3_LANGUAGES,
];

export default function LanguageSelector() {
  const [currentLang, setCurrentLang] = useState<string>('en');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    };

    const cookieVal = getCookie('googtrans');
    let activeCode = 'en';
    if (cookieVal) {
      const parts = cookieVal.split('/');
      activeCode = parts[parts.length - 1] || 'en';
    } else {
      activeCode = localStorage.getItem('preferred_language') || 'en';
    }

    setCurrentLang(activeCode);

    // Initialize Google Translate Element
    (window as any).googleTranslateElementInit = () => {
      if ((window as any).google?.translate?.TranslateElement) {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: ALL_LANGUAGES.map((l) => l.code).join(','),
            autoDisplay: false,
          },
          'google_translate_element'
        );
      }
    };

    // Load Google Translate script if not present
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }

    // Suppress Google Translate top banner iframe and keep body.style.top at 0px
    const enforceZeroTop = () => {
      if (document.body.style.top && document.body.style.top !== '0px') {
        document.body.style.top = '0px';
      }
      const banner = document.querySelectorAll<HTMLElement>(
        '.goog-te-banner-frame, iframe.skiptranslate, body > .skiptranslate, body > div[class*="skiptranslate"]'
      );
      banner.forEach((b) => {
        b.style.display = 'none';
        b.style.visibility = 'hidden';
        b.style.height = '0px';
      });
    };

    enforceZeroTop();
    const observer = new MutationObserver(enforceZeroTop);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'], childList: true });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });

    return () => {
      observer.disconnect();
    };
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
    setCurrentLang(langCode);
    setIsOpen(false);
    localStorage.setItem('preferred_language', langCode);

    const hostname = window.location.hostname;

    if (langCode === 'en') {
      // Clear translation cookie to restore original language
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      document.cookie = `googtrans=; path=/; domain=${hostname}; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
      document.cookie = `googtrans=; path=/; domain=.${hostname}; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
      window.location.reload();
      return;
    }

    // Set cookie for translation
    document.cookie = `googtrans=/en/${langCode}; path=/;`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${hostname};`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${hostname};`;

    // Trigger Google Translate combo if available
    const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo');
    if (combo) {
      combo.value = langCode;
      combo.dispatchEvent(new Event('change'));
    } else {
      window.location.reload();
    }
  };

  const activeLangObj = ALL_LANGUAGES.find((l) => l.code === currentLang) || ALL_LANGUAGES[0];

  return (
    <div ref={containerRef} className="notranslate relative inline-block text-left">
      <div id="google_translate_element" className="hidden" style={{ display: 'none' }} />

      {/* Trigger Button replacing "Developed by Tasnim Sakib" */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-base-100 hover:bg-base-200 border border-base-300 shadow-2xs hover:border-primary/50 text-xs font-semibold text-base-content transition-all group"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-3.5 h-3.5 text-primary shrink-0 transition-transform group-hover:rotate-12" />
        <span>{mounted ? activeLangObj.nativeName : 'English'}</span>
        <ChevronUp className={`w-3.5 h-3.5 text-base-content/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
                Select Your Language
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
                const isSelected = currentLang === lang.code;
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
                const isSelected = currentLang === lang.code;
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
                const isSelected = currentLang === lang.code;
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
