'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles, ChevronDown, Image, FileText, Menu, X, ShieldCheck } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SearchModal from './SearchModal';

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="w-full border-b border-base-300 bg-base-100/90 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="SnapDoc Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight text-base-content group-hover:text-primary transition-colors">
                  Snap<span className="text-primary">Doc</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-base-content/50">
                  Online Image & PDF Tools
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {/* Image Tools Dropdown */}
              <div className="dropdown dropdown-hover">
                <label tabIndex={0} className="btn btn-ghost btn-sm font-medium gap-1 text-base-content/80 hover:text-base-content cursor-pointer">
                  <Image className="w-4 h-4 text-blue-500" />
                  <span>Image Tools</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </label>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-3 shadow-xl bg-base-100 rounded-2xl w-60 border border-base-300">
                  <li><Link href="/compress-jpg" className="text-xs font-medium py-1.5">Compress JPG / JPEG</Link></li>
                  <li><Link href="/compress-jpg-to-10kb" className="text-xs font-medium py-1.5 text-primary font-semibold">Compress JPG to 10KB</Link></li>
                  <li><Link href="/compress-image" className="text-xs font-medium py-1.5">General Image Compressor</Link></li>
                  <li><Link href="/resize-image" className="text-xs font-medium py-1.5">Resize Image</Link></li>
                  <li><Link href="/crop-image" className="text-xs font-medium py-1.5">Crop Image</Link></li>
                  <li><Link href="/jpg-to-png" className="text-xs font-medium py-1.5">JPG to PNG</Link></li>
                  <li><Link href="/png-to-jpg" className="text-xs font-medium py-1.5">PNG to JPG</Link></li>
                  <li><Link href="/jpg-to-webp" className="text-xs font-medium py-1.5">JPG to WebP</Link></li>
                  <li><Link href="/image-to-pdf" className="text-xs font-medium py-1.5 text-primary font-semibold">Image to PDF</Link></li>
                </ul>
              </div>

              {/* Merged PDF Tools Dropdown (Organize + Convert) */}
              <div className="dropdown dropdown-hover">
                <label tabIndex={0} className="btn btn-ghost btn-sm font-medium gap-1 text-base-content/80 hover:text-base-content cursor-pointer">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span>PDF Tools</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </label>
                <div tabIndex={0} className="dropdown-content z-[1] p-4 shadow-2xl bg-base-100 rounded-2xl w-[480px] border border-base-300 grid grid-cols-2 gap-4">
                  {/* Column 1: Organize & Manage */}
                  <div>
                    <span className="text-[11px] font-bold text-base-content/50 uppercase tracking-wider px-2 block mb-1.5">
                      Organize & Edit
                    </span>
                    <ul className="menu menu-compact p-0 text-xs space-y-0.5">
                      <li><Link href="/organize-pdf" className="font-semibold text-primary py-1.5">Visual Page Organizer</Link></li>
                      <li><Link href="/split-pdf" className="py-1.5">Split PDF</Link></li>
                      <li><Link href="/merge-pdf" className="py-1.5">Merge PDF</Link></li>
                      <li><Link href="/extract-pdf-pages" className="py-1.5">Extract PDF Pages</Link></li>
                      <li><Link href="/delete-pdf-pages" className="py-1.5">Delete PDF Pages</Link></li>
                      <li><Link href="/rotate-pdf" className="py-1.5">Rotate PDF</Link></li>
                      <li><Link href="/compress-pdf" className="py-1.5 text-emerald-600 font-medium">Compress PDF</Link></li>
                    </ul>
                  </div>

                  {/* Column 2: Convert */}
                  <div className="border-l border-base-200 pl-4">
                    <span className="text-[11px] font-bold text-base-content/50 uppercase tracking-wider px-2 block mb-1.5">
                      Convert PDF
                    </span>
                    <ul className="menu menu-compact p-0 text-xs space-y-0.5">
                      <li><Link href="/pdf-to-word" className="py-1.5 font-medium text-primary">PDF to Word</Link></li>
                      <li><Link href="/pdf-to-excel" className="py-1.5">PDF to Excel / CSV</Link></li>
                      <li><Link href="/pdf-to-png" className="py-1.5">PDF to PNG</Link></li>
                      <li><Link href="/pdf-to-jpg" className="py-1.5">PDF to JPG</Link></li>
                      <li><Link href="/word-to-pdf" className="py-1.5">Word to PDF</Link></li>
                      <li><Link href="/excel-to-pdf" className="py-1.5">Excel to PDF</Link></li>
                      <li><Link href="/pdf-ocr" className="py-1.5">OCR Text Extractor</Link></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Edit & AI Dropdown */}
              <div className="dropdown dropdown-hover">
                <label tabIndex={0} className="btn btn-ghost btn-sm font-medium gap-1 text-base-content/80 hover:text-base-content cursor-pointer">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Edit & AI</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </label>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-3 shadow-xl bg-base-100 rounded-2xl w-60 border border-base-300">
                  <li><Link href="/sign-pdf" className="text-xs font-semibold py-1.5 text-primary">Sign PDF (eSign)</Link></li>
                  <li><Link href="/add-page-numbers-to-pdf" className="text-xs font-medium py-1.5">Add Page Numbers</Link></li>
                  <li><Link href="/watermark-pdf" className="text-xs font-medium py-1.5">Watermark PDF</Link></li>
                  <li><Link href="/crop-pdf" className="text-xs font-medium py-1.5">Crop PDF</Link></li>
                  <li><Link href="/flatten-pdf" className="text-xs font-medium py-1.5">Flatten PDF</Link></li>
                  <li><Link href="/ai-pdf" className="text-xs font-semibold py-1.5 text-violet-600">AI PDF Summarizer</Link></li>
                  <li><Link href="/chat-with-pdf" className="text-xs font-medium py-1.5">Chat with PDF</Link></li>
                  <li><Link href="/pdf-scanner" className="text-xs font-medium py-1.5 text-teal-600">Camera Scanner</Link></li>
                </ul>
              </div>

              <Link href="/tools" className="btn btn-ghost btn-sm font-medium text-base-content/80 hover:text-base-content">
                All Tools
              </Link>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            {/* Quick Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-base-200 hover:bg-base-300/80 border border-base-300 text-xs text-base-content/60 transition-colors"
              aria-label="Search tools"
            >
              <Search className="w-3.5 h-3.5 text-base-content/50" />
              <span className="hidden sm:inline">Search tools...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-base-100 rounded border border-base-300 text-base-content/70">
                Ctrl K
              </kbd>
            </button>

            {/* Privacy Badge indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% In-Memory</span>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="btn btn-ghost btn-circle btn-sm md:hidden text-base-content"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-base-300 bg-base-100 p-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <div className="space-y-1">
              <div className="font-semibold text-xs text-base-content/50 uppercase tracking-wider px-2 py-1">
                Popular Image Tools
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Link href="/compress-jpg" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">Compress JPG</Link>
                <Link href="/compress-jpg-to-10kb" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-base-200">JPG to 10KB</Link>
                <Link href="/resize-image" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">Resize Image</Link>
                <Link href="/jpg-to-png" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">JPG to PNG</Link>
                <Link href="/png-to-jpg" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">PNG to JPG</Link>
                <Link href="/image-to-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">Image to PDF</Link>
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-base-200">
              <div className="font-semibold text-xs text-base-content/50 uppercase tracking-wider px-2 py-1">
                PDF Tools
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Link href="/organize-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">Organize PDF</Link>
                <Link href="/merge-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">Merge PDF</Link>
                <Link href="/split-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">Split PDF</Link>
                <Link href="/pdf-to-word" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">PDF to Word</Link>
                <Link href="/compress-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">Compress PDF</Link>
                <Link href="/sign-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">Sign PDF</Link>
              </div>
            </div>

            <div className="pt-2 border-t border-base-200">
              <Link
                href="/tools"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn btn-primary btn-sm w-full"
              >
                Browse All Tools
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Global Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
