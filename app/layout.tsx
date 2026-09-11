import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ConnectionStatusBanner from '@/components/ui/ConnectionStatusBanner';

export const metadata: Metadata = {
  metadataBase: new URL('https://snapdoc.app'),
  title: {
    default: 'SnapDoc - Free Online Image & PDF Tools | Compress, Resize, Convert',
    template: '%s | SnapDoc Tools',
  },
  description:
    'Ultra-fast, privacy-first online tools to compress JPG to 10KB/20KB/50KB, resize images, convert PNG/JPG/WebP, merge & split PDFs, and convert Image to PDF. 100% free and in-memory processing.',
  keywords: [
    'compress jpg',
    'compress jpg to 10kb',
    'image resizer',
    'jpg to png',
    'png to jpg',
    'image to pdf',
    'pdf to jpg',
    'merge pdf',
    'split pdf',
    'organize pdf',
    'sign pdf',
    'free image tools',
    'online pdf editor',
    'pdf converter',
  ],
  authors: [{ name: 'SnapDoc Team' }, { name: 'Tasnim Sakib' }],
  creator: 'Tasnim Sakib',
  publisher: 'SnapDoc',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://snapdoc.app',
    siteName: 'SnapDoc',
    title: 'SnapDoc - Free Online Image & PDF Utilities',
    description: 'Compress, resize, convert, and optimize images & PDFs in memory with zero permanent storage.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'SnapDoc Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnapDoc - Free Online Image & PDF Utilities',
    description: 'Compress, resize, convert, and optimize images & PDFs in memory with zero permanent storage.',
    images: ['/logo.png'],
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
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/logo.png',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SnapDoc',
  url: 'https://snapdoc.app',
  logo: 'https://snapdoc.app/logo.png',
  description: 'Ultra-fast, privacy-first online tools for image and PDF compression, conversion, and organization.',
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SnapDoc',
  url: 'https://snapdoc.app',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://snapdoc.app/tools?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Dancing+Script:wght@600;700&family=Great+Vibes&family=Pacifico&family=Sacramento&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="bg-base-200/30 text-base-content antialiased flex flex-col min-h-screen selection:bg-primary selection:text-white">
        <div className="sticky top-0 z-50 w-full flex flex-col">
          <ConnectionStatusBanner />
          <Header />
        </div>
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
