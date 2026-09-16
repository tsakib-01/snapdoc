import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Image & PDF Tools - Complete Free Suite | SnapDoc',
  description:
    'Browse 30+ free, privacy-first online tools. Compress JPG to exact sizes (10KB, 20KB, 50KB), convert Excel to PDF, sign documents, chat with PDF, resize, crop, merge, and split files.',
  alternates: {
    canonical: 'https://snapdoc.app/tools',
  },
  openGraph: {
    title: 'All Free Image & PDF Tools | SnapDoc',
    description:
      'Explore 30+ free utilities for PDF and image compression, conversion, editing, and e-signing. 100% private, client-side processing.',
    url: 'https://snapdoc.app/tools',
    siteName: 'SnapDoc',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'SnapDoc Tools Catalog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Free Image & PDF Tools | SnapDoc',
    description:
      'Explore 30+ free utilities for PDF and image compression, conversion, editing, and e-signing. 100% private.',
    images: ['/logo.png'],
  },
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
