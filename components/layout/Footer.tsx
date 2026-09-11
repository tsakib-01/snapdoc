import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Zap, Lock, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-base-300 bg-base-200/50 text-base-content transition-colors">
      {/* Privacy & Trust Bar */}
      <div className="border-b border-base-300 py-6 bg-base-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">100% Privacy Focused</h4>
              <p className="text-xs text-base-content/60">Files processed in memory and never saved to disk or database.</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Lightning Fast</h4>
              <p className="text-xs text-base-content/60">Engineered with high-speed performance architecture.</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Free Forever & No Signup</h4>
              <p className="text-xs text-base-content/60">No account required, no watermark, no hidden subscription traps.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="SnapDoc Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-lg tracking-tight">
                Snap<span className="text-primary">Doc</span>
              </span>
            </Link>
           <p className="text-xs text-base-content/70 leading-relaxed max-w-sm">
  The modern, privacy-first online toolkit for compressing, resizing, converting, and editing images and PDF files. Fast, free, and secure.
</p>

<div className="text-xs text-base-content/60 mt-3">
  Developed by <span className="font-medium text-base-content/80">Tasnim Sakib</span>
</div>

<div className="text-xs text-base-content/50 mt-2">
  &copy; {new Date().getFullYear()} SnapDoc. All rights reserved.
</div>
          </div>

          {/* PDF Organize & Edit */}
          <div className="space-y-3">
            <h5 className="font-semibold text-xs text-base-content/90 uppercase tracking-wider">Organize & Edit</h5>
            <ul className="space-y-2 text-xs text-base-content/70">
              <li><Link href="/organize-pdf" className="hover:text-primary transition-colors text-primary font-medium">Organize PDF</Link></li>
              <li><Link href="/extract-pdf-pages" className="hover:text-primary transition-colors">Extract Pages</Link></li>
              <li><Link href="/delete-pdf-pages" className="hover:text-primary transition-colors">Delete Pages</Link></li>
              <li><Link href="/rotate-pdf" className="hover:text-primary transition-colors">Rotate PDF</Link></li>
              <li><Link href="/sign-pdf" className="hover:text-primary transition-colors">Sign PDF (eSign)</Link></li>
              <li><Link href="/add-page-numbers-to-pdf" className="hover:text-primary transition-colors">Page Numbers</Link></li>
              <li><Link href="/watermark-pdf" className="hover:text-primary transition-colors">Watermark PDF</Link></li>
            </ul>
          </div>

          {/* Convert & Office */}
          <div className="space-y-3">
            <h5 className="font-semibold text-xs text-base-content/90 uppercase tracking-wider">Convert & Office</h5>
            <ul className="space-y-2 text-xs text-base-content/70">
              <li><Link href="/pdf-to-word" className="hover:text-primary transition-colors">PDF to Word</Link></li>
              <li><Link href="/pdf-to-excel" className="hover:text-primary transition-colors">PDF to Excel</Link></li>
              <li><Link href="/pdf-to-jpg" className="hover:text-primary transition-colors">PDF to JPG</Link></li>
              <li><Link href="/pdf-to-png" className="hover:text-primary transition-colors">PDF to PNG</Link></li>
              <li><Link href="/word-to-pdf" className="hover:text-primary transition-colors">Word to PDF</Link></li>
              <li><Link href="/excel-to-pdf" className="hover:text-primary transition-colors">Excel to PDF</Link></li>
              <li><Link href="/txt-to-pdf" className="hover:text-primary transition-colors">TXT to PDF</Link></li>
            </ul>
          </div>

          {/* AI & Image Tools */}
          <div className="space-y-3">
            <h5 className="font-semibold text-xs text-base-content/90 uppercase tracking-wider">AI & Compress</h5>
            <ul className="space-y-2 text-xs text-base-content/70">
              <li><Link href="/ai-pdf" className="hover:text-primary transition-colors text-violet-600 font-medium">AI PDF Assistant</Link></li>
              <li><Link href="/chat-with-pdf" className="hover:text-primary transition-colors">Chat with PDF</Link></li>
              <li><Link href="/pdf-scanner" className="hover:text-primary transition-colors">Camera Scanner</Link></li>
              <li><Link href="/compress-pdf" className="hover:text-primary transition-colors">Compress PDF</Link></li>
              <li><Link href="/compress-jpg-to-10kb" className="hover:text-primary transition-colors">JPG to 10KB</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
