import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ConnectionStatusBanner from '@/components/ui/ConnectionStatusBanner';

export const metadata: Metadata = {
  metadataBase: new URL('https://jpgeasy.com'),
  title: {
    default: 'JPGEASY - Free Online Image & PDF Tools | Compress, Resize, Convert',
    template: '%s | JPGEASY Tools',
  },
  description:
    'Ultra-fast, privacy-first online tools to compress JPG to 10KB/20KB/50KB/100KB, resize images, convert Excel to PDF, merge & split PDFs, e-sign documents, and chat with PDF. 100% free with in-memory processing and zero permanent storage.',
  alternates: {
    canonical: 'https://jpgeasy.com',
  },
  keywords: [
    'compress jpg',
    'compress jpg to 10kb',
    'compress jpg to 20kb',
    'compress jpg to 50kb',
    'compress jpg to 100kb',
    'compress jpg to 200kb',
    'compress jpg to 500kb',
    'compress image online',
    'excel to pdf',
    'spreadsheet to pdf',
    'pdf to excel',
    'image resizer',
    'jpg to png',
    'png to jpg',
    'webp to jpg',
    'webp to png',
    'image to pdf',
    'pdf to jpg',
    'pdf to png',
    'merge pdf',
    'split pdf',
    'organize pdf',
    'sign pdf',
    'esign pdf online',
    'chat with pdf',
    'ai pdf assistant',
    'crop pdf',
    'crop image',
    'flatten pdf',
    'watermark pdf',
    'pdf ocr extractor',
    'free image tools',
    'online pdf editor',
    'pdf converter',
  ],
  authors: [{ name: 'JPGEASY Team' }, { name: 'Tasnim Sakib' }],
  creator: 'Tasnim Sakib',
  publisher: 'JPGEASY',
  category: 'technology',
  classification: 'Utilities',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://jpgeasy.com',
    siteName: 'JPGEASY',
    title: 'JPGEASY - Free Online Image & PDF Utilities',
    description: 'Compress, resize, convert, e-sign, and optimize images & PDFs in memory with zero permanent storage.',
    images: [
      {
        url: 'https://jpgeasy.com/logo.png',
        width: 512,
        height: 512,
        alt: 'JPGEASY - Free Online Image and PDF Tools',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JPGEASY - Free Online Image & PDF Utilities',
    description: 'Compress, resize, convert, e-sign, and optimize images & PDFs in memory with zero permanent storage.',
    images: ['https://jpgeasy.com/logo.png'],
    creator: '@jpgeasy',
    site: '@jpgeasy',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'JPGEASY',
  url: 'https://jpgeasy.com',
  logo: 'https://jpgeasy.com/logo.png',
  description: 'Ultra-fast, privacy-first online tools for image and PDF compression, conversion, e-signing, and organization.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@jpgeasy.com',
    url: 'https://jpgeasy.com/about',
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'JPGEASY',
  alternateName: ['JPGEASY Tools', 'JPGEASY App'],
  url: 'https://jpgeasy.com',
  description: 'Free online image and PDF processing suite with in-memory execution.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://jpgeasy.com/tools?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'JPGEASY',
  url: 'https://jpgeasy.com',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'All modern web browsers (Chrome, Edge, Safari, Firefox)',
  browserRequirements: 'Requires JavaScript and HTML5 Canvas support.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '1280',
    bestRating: '5',
    worstRating: '1',
  },
  description: 'Complete online tool suite to compress, resize, convert, edit, and e-sign PDF documents and images completely free with client-side privacy.',
};

import { LanguageProvider } from '@/lib/i18n/LanguageContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Monetag In-Page Push (Clean Native Banner) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(s){s.dataset.zone='12082341',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));`,
          }}
        />
        {/* Monetag Push Notifications */}
        <script
          src="https://5gvci.com/act/files/tag.min.js?z=12082359"
          data-cfasync="false"
          async
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Clean up any legacy snapdoc caches so only JPGEASY cache is active
                if ('caches' in window) {
                  caches.keys().then(function(keys) {
                    for (var j = 0; j < keys.length; j++) {
                      if (keys[j].indexOf('snapdoc') !== -1) {
                        caches.delete(keys[j]);
                      }
                    }
                  }).catch(function() {});
                }
                var savedTheme = localStorage.getItem('theme');
                document.documentElement.setAttribute('data-theme', savedTheme === 'dark' ? 'dark' : 'light');
                var savedLang = localStorage.getItem('jpgeasy_lang') || localStorage.getItem('snapdoc_lang');
                if (savedLang) {
                  document.documentElement.setAttribute('lang', savedLang);
                  document.documentElement.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');
                }
              } catch (_) {}
            `,
          }}
        />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Dancing+Script:wght@600;700&family=Great+Vibes&family=Pacifico&family=Sacramento&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
      </head>
      <body className="bg-base-200/30 text-base-content antialiased flex flex-col min-h-screen selection:bg-primary selection:text-white">
        <LanguageProvider>
          <div className="sticky top-0 z-50 w-full flex flex-col">
            <ConnectionStatusBanner />
            <Header />
          </div>
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
