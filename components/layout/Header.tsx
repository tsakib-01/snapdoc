'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles, ChevronDown, Image, FileText, Menu, X, ShieldCheck } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SearchModal from './SearchModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <header className="w-full border-b border-base-300 bg-base-100/90 backdrop-blur-md transition-colors select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 lg:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="SnapDoc Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-lg leading-tight tracking-tight text-base-content group-hover:text-primary transition-colors whitespace-nowrap">
                  Snap<span className="text-primary">Doc</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-base-content/50 whitespace-nowrap truncate max-w-[130px] sm:max-w-[190px]">
                  {t('brandSubtitle', 'Online Image & PDF Tools')}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0">
              {/* Image Tools Dropdown */}
              <div className="dropdown dropdown-hover">
                <label
                  tabIndex={0}
                  className="btn btn-ghost btn-sm font-medium gap-1 text-base-content/80 hover:text-base-content cursor-pointer whitespace-nowrap flex-nowrap shrink-0 px-2 xl:px-3"
                >
                  <Image className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="whitespace-nowrap">{t('imageTools', 'Image Tools')}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
                </label>
                <ul
                  tabIndex={0}
                  className="dropdown-content z-[1] menu p-3 shadow-xl bg-base-100 rounded-2xl w-60 border border-base-300"
                >
                  <li><Link href="/compress-jpg" className="text-xs font-medium py-1.5">{t('compressJpg', 'Compress JPG / JPEG')}</Link></li>
                  <li><Link href="/compress-jpg-to-10kb" className="text-xs font-medium py-1.5 text-primary font-semibold">{t('compressJpg10kb', 'Compress JPG to 10KB')}</Link></li>
                  <li><Link href="/compress-image" className="text-xs font-medium py-1.5">{t('compressImage', 'General Image Compressor')}</Link></li>
                  <li><Link href="/resize-image" className="text-xs font-medium py-1.5">{t('resizeImage', 'Resize Image')}</Link></li>
                  <li><Link href="/crop-image" className="text-xs font-medium py-1.5">{t('cropImage', 'Crop Image')}</Link></li>
                  <li><Link href="/jpg-to-png" className="text-xs font-medium py-1.5">{t('jpgToPng', 'JPG to PNG')}</Link></li>
                  <li><Link href="/png-to-jpg" className="text-xs font-medium py-1.5">{t('pngToJpg', 'PNG to JPG')}</Link></li>
                  <li><Link href="/jpg-to-webp" className="text-xs font-medium py-1.5">{t('jpgToWebp', 'JPG to WebP')}</Link></li>
                  <li><Link href="/image-to-pdf" className="text-xs font-medium py-1.5 text-primary font-semibold">{t('imageToPdf', 'Image to PDF')}</Link></li>
                </ul>
              </div>

              {/* Merged PDF Tools Dropdown (Organize + Convert) */}
              <div className="dropdown dropdown-hover">
                <label
                  tabIndex={0}
                  className="btn btn-ghost btn-sm font-medium gap-1 text-base-content/80 hover:text-base-content cursor-pointer whitespace-nowrap flex-nowrap shrink-0 px-2 xl:px-3"
                >
                  <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="whitespace-nowrap">{t('pdfTools', 'PDF Tools')}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
                </label>
                <div
                  tabIndex={0}
                  className="dropdown-content z-[1] p-4 shadow-2xl bg-base-100 rounded-2xl w-[480px] border border-base-300 grid grid-cols-2 gap-4"
                >
                  {/* Column 1: Organize & Manage */}
                  <div>
                    <span className="text-[11px] font-bold text-base-content/50 uppercase tracking-wider px-2 block mb-1.5 whitespace-nowrap">
                      {t('organizeEdit', 'Organize & Edit')}
                    </span>
                    <ul className="menu menu-compact p-0 text-xs space-y-0.5">
                      <li><Link href="/organize-pdf" className="font-semibold text-primary py-1.5">{t('organizePdf', 'Visual Page Organizer')}</Link></li>
                      <li><Link href="/split-pdf" className="py-1.5">{t('splitPdf', 'Split PDF')}</Link></li>
                      <li><Link href="/merge-pdf" className="py-1.5">{t('mergePdf', 'Merge PDF')}</Link></li>
                      <li><Link href="/extract-pdf-pages" className="py-1.5">{t('extractPages', 'Extract PDF Pages')}</Link></li>
                      <li><Link href="/delete-pdf-pages" className="py-1.5">{t('deletePages', 'Delete PDF Pages')}</Link></li>
                      <li><Link href="/rotate-pdf" className="py-1.5">{t('rotatePdf', 'Rotate PDF')}</Link></li>
                      <li><Link href="/compress-pdf" className="py-1.5 text-emerald-600 font-medium">{t('compressPdf', 'Compress PDF')}</Link></li>
                    </ul>
                  </div>

                  {/* Column 2: Convert */}
                  <div className="border-l border-base-200 pl-4">
                    <span className="text-[11px] font-bold text-base-content/50 uppercase tracking-wider px-2 block mb-1.5 whitespace-nowrap">
                      {t('convertPdf', 'Convert PDF')}
                    </span>
                    <ul className="menu menu-compact p-0 text-xs space-y-0.5">
                      <li><Link href="/pdf-to-png" className="py-1.5 font-medium text-primary">{t('pdfToPng', 'PDF to PNG')}</Link></li>
                      <li><Link href="/pdf-to-jpg" className="py-1.5">{t('pdfToJpg', 'PDF to JPG')}</Link></li>
                      <li><Link href="/pdf-ocr" className="py-1.5">{t('pdfOcr', 'OCR Text Extractor')}</Link></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Edit PDF Dropdown */}
              <div className="dropdown dropdown-hover">
                <label
                  tabIndex={0}
                  className="btn btn-ghost btn-sm font-medium gap-1 text-base-content/80 hover:text-base-content cursor-pointer whitespace-nowrap flex-nowrap shrink-0 px-2 xl:px-3"
                >
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="whitespace-nowrap">{t('editPdf', 'Edit PDF')}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
                </label>
                <ul
                  tabIndex={0}
                  className="dropdown-content z-[1] menu p-3 shadow-xl bg-base-100 rounded-2xl w-60 border border-base-300"
                >
                  <li><Link href="/sign-pdf" className="text-xs font-semibold py-1.5 text-primary">{t('signPdf', 'Sign PDF (eSign)')}</Link></li>
                  <li><Link href="/add-page-numbers-to-pdf" className="text-xs font-medium py-1.5">{t('pageNumbers', 'Page Numbers')}</Link></li>
                  <li><Link href="/watermark-pdf" className="text-xs font-medium py-1.5">{t('watermarkPdf', 'Watermark PDF')}</Link></li>
                  <li><Link href="/crop-pdf" className="text-xs font-medium py-1.5">{t('cropPdf', 'Crop PDF')}</Link></li>
                  <li><Link href="/pdf-scanner" className="text-xs font-medium py-1.5 text-teal-600">{t('scanner', 'Camera Scanner')}</Link></li>
                </ul>
              </div>

              <Link
                href="/guides"
                className="hidden xl:inline-flex btn btn-ghost btn-sm font-medium text-base-content/80 hover:text-base-content whitespace-nowrap px-2"
              >
                {t('guides', 'Guides')}
              </Link>
              <Link
                href="/tools"
                className="hidden 2xl:inline-flex btn btn-ghost btn-sm font-medium text-base-content/80 hover:text-base-content whitespace-nowrap px-2"
              >
                {t('toolsResources', 'All Tools')}
              </Link>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-base-200 hover:bg-base-300/80 border border-base-300 text-xs text-base-content/60 transition-colors whitespace-nowrap shrink-0"
              aria-label="Search tools"
            >
              <Search className="w-3.5 h-3.5 text-base-content/50 shrink-0" />
              <span className="hidden xl:inline whitespace-nowrap truncate max-w-[120px]">
                {t('searchPlaceholder', 'Search tools...')}
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-base-100 rounded border border-base-300 text-base-content/70">
                Ctrl K
              </kbd>
            </button>

            {/* Privacy Badge indicator */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20 whitespace-nowrap shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{t('privacyBadge', '100% In-Memory')}</span>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="btn btn-ghost btn-circle btn-sm lg:hidden text-base-content shrink-0"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-b border-base-300 bg-base-100 p-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <div className="space-y-1">
              <div className="font-semibold text-xs text-base-content/50 uppercase tracking-wider px-2 py-1">
                {t('imageTools', 'Popular Image Tools')}
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Link href="/compress-jpg" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">{t('compressJpg', 'Compress JPG')}</Link>
                <Link href="/compress-jpg-to-10kb" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-base-200">{t('compressJpg10kb', 'JPG to 10KB')}</Link>
                <Link href="/resize-image" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">{t('resizeImage', 'Resize Image')}</Link>
                <Link href="/jpg-to-png" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">{t('jpgToPng', 'JPG to PNG')}</Link>
                <Link href="/png-to-jpg" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">{t('pngToJpg', 'PNG to JPG')}</Link>
                <Link href="/image-to-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">{t('imageToPdf', 'Image to PDF')}</Link>
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-base-200">
              <div className="font-semibold text-xs text-base-content/50 uppercase tracking-wider px-2 py-1">
                {t('pdfTools', 'PDF Tools')}
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Link href="/organize-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">{t('organizePdf', 'Organize PDF')}</Link>
                <Link href="/merge-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">{t('mergePdf', 'Merge PDF')}</Link>
                <Link href="/split-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">{t('splitPdf', 'Split PDF')}</Link>
                <Link href="/pdf-ocr" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">{t('pdfOcr', 'PDF OCR')}</Link>
                <Link href="/compress-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">{t('compressPdf', 'Compress PDF')}</Link>
                <Link href="/sign-pdf" onClick={() => setIsMobileMenuOpen(false)} className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-base-200">{t('signPdf', 'Sign PDF')}</Link>
              </div>
            </div>

            <div className="pt-2 border-t border-base-200 flex gap-2">
              <Link
                href="/guides"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn btn-outline btn-sm flex-1"
              >
                {t('guides', 'Guides')}
              </Link>
              <Link
                href="/tools"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn btn-primary btn-sm flex-1"
              >
                {t('toolsResources', 'All Tools')}
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
