import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

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
    'free image tools',
    'online pdf editor',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://snapdoc.app',
    siteName: 'SnapDoc',
    title: 'SnapDoc - Free Online Image & PDF Utilities',
    description: 'Compress, resize, convert, and optimize images & PDFs in memory with zero permanent storage.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnapDoc - Free Online Image & PDF Utilities',
    description: 'Compress, resize, convert, and optimize images & PDFs in memory with zero permanent storage.',
  },
  robots: {
    index: true,
    follow: true,
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className="bg-base-200/30 text-base-content antialiased flex flex-col min-h-screen selection:bg-primary selection:text-white">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
