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
    'Ultra-fast, privacy-first online tools to compress JPG to 10KB/20KB/50KB/100KB, resize images, convert Excel to PDF, merge & split PDFs, e-sign documents, and chat with PDF. 100% free with in-memory processing and zero permanent storage.',
  alternates: {
    canonical: 'https://snapdoc.app',
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
  authors: [{ name: 'SnapDoc Team' }, { name: 'Tasnim Sakib' }],
  creator: 'Tasnim Sakib',
  publisher: 'SnapDoc',
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
    url: 'https://snapdoc.app',
    siteName: 'SnapDoc',
    title: 'SnapDoc - Free Online Image & PDF Utilities',
    description: 'Compress, resize, convert, e-sign, and optimize images & PDFs in memory with zero permanent storage.',
    images: [
      {
        url: 'https://snapdoc.app/logo.png',
        width: 512,
        height: 512,
        alt: 'SnapDoc - Free Online Image and PDF Tools',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnapDoc - Free Online Image & PDF Utilities',
    description: 'Compress, resize, convert, e-sign, and optimize images & PDFs in memory with zero permanent storage.',
    images: ['https://snapdoc.app/logo.png'],
    creator: '@snapdoc',
    site: '@snapdoc',
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
  description: 'Ultra-fast, privacy-first online tools for image and PDF compression, conversion, e-signing, and organization.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@snapdoc.app',
    url: 'https://snapdoc.app/about',
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SnapDoc',
  alternateName: ['SnapDoc Tools', 'SnapDoc App'],
  url: 'https://snapdoc.app',
  description: 'Free online image and PDF processing suite with in-memory execution.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://snapdoc.app/tools?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SnapDoc',
  url: 'https://snapdoc.app',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
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
