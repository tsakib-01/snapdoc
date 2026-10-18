'use client';

import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

export interface SiteLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export const SITE_LANGUAGES: SiteLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh-CN', name: 'Chinese Simplified', nativeName: '中文 (简体)' },
  { code: 'zh-TW', name: 'Chinese Traditional', nativeName: '中文 (繁體)' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'cat', name: 'Catalan', nativeName: 'Català' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'hin', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
];

export default function LanguageSelector() {
  const [currentLang, setCurrentLang] = useState<string>('en');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);

    // Read active language from cookie or localStorage
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
            includedLanguages: SITE_LANGUAGES.map((l) => l.code).join(','),
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
  }, []);

  const handleLanguageChange = (langCode: string) => {
    setCurrentLang(langCode);
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

  return (
    <div className="notranslate flex items-center gap-2">
      <div id="google_translate_element" className="hidden" style={{ display: 'none' }} />
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-base-100 border border-base-300 shadow-2xs hover:border-primary/40 transition-colors">
        <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
        <select
          aria-label="Select Language"
          value={mounted ? currentLang : 'en'}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-transparent text-xs font-medium text-base-content cursor-pointer focus:outline-hidden py-0.5 pr-1"
        >
          {SITE_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-base-100 text-base-content">
              {lang.code === 'en' ? 'English' : `${lang.nativeName} (${lang.name})`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
