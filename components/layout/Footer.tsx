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
              <p className="text-xs text-base-content/60">Engineered with high-speed WebAssembly and Node.js Sharp.</p>
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
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

          {/* Compress Tools */}
          <div className="space-y-3">
            <h5 className="font-semibold text-xs text-base-content/90 uppercase tracking-wider">Compress Tools</h5>
            <ul className="space-y-2 text-xs text-base-content/70">
              <li><Link href="/compress-jpg" className="hover:text-primary transition-colors">Compress JPG</Link></li>
              <li><Link href="/compress-jpg-to-10kb" className="hover:text-primary transition-colors text-primary font-medium">JPG to 10KB</Link></li>
              <li><Link href="/compress-jpg-to-20kb" className="hover:text-primary transition-colors">JPG to 20KB</Link></li>
              <li><Link href="/compress-jpg-to-50kb" className="hover:text-primary transition-colors">JPG to 50KB</Link></li>
              <li><Link href="/compress-image" className="hover:text-primary transition-colors">Compress Image</Link></li>
            </ul>
          </div>

          {/* Convert & Edit */}
          <div className="space-y-3">
            <h5 className="font-semibold text-xs text-base-content/90 uppercase tracking-wider">Convert & Edit</h5>
            <ul className="space-y-2 text-xs text-base-content/70">
              <li><Link href="/jpg-to-png" className="hover:text-primary transition-colors">JPG to PNG</Link></li>
              <li><Link href="/png-to-jpg" className="hover:text-primary transition-colors">PNG to JPG</Link></li>
              <li><Link href="/jpg-to-webp" className="hover:text-primary transition-colors">JPG to WebP</Link></li>
              <li><Link href="/resize-image" className="hover:text-primary transition-colors">Resize Image</Link></li>
              <li><Link href="/crop-image" className="hover:text-primary transition-colors">Crop Image</Link></li>
            </ul>
          </div>

          {/* PDF & Legal */}
          <div className="space-y-3">
            <h5 className="font-semibold text-xs text-base-content/90 uppercase tracking-wider">PDF & Info</h5>
            <ul className="space-y-2 text-xs text-base-content/70">
              <li><Link href="/image-to-pdf" className="hover:text-primary transition-colors">Image to PDF</Link></li>
              <li><Link href="/pdf-to-jpg" className="hover:text-primary transition-colors">PDF to JPG</Link></li>
              <li><Link href="/merge-pdf" className="hover:text-primary transition-colors">Merge PDF</Link></li>
              <li><Link href="/split-pdf" className="hover:text-primary transition-colors">Split PDF</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
