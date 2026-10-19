'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle2,
  Minimize2,
  FileImage,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Check,
  Crop,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { TOOLS, CATEGORIES, ToolMeta } from '@/lib/config/tools';
import ToolCard from '@/components/ui/ToolCard';
import AdSlot from '@/components/ui/AdSlot';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'compress':
        return <Minimize2 className="w-4 h-4" />;
      case 'convert':
        return <RefreshCw className="w-4 h-4" />;
      case 'resize':
        return <Maximize2 className="w-4 h-4" />;
      case 'edit':
        return <Crop className="w-4 h-4" />;
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'all':
      default:
        return <SlidersHorizontal className="w-4 h-4" />;
    }
  };

  const getCategoryName = (cat: { id: string; name: string }) => {
    switch (cat.id) {
      case 'all':
        return t('catAll', cat.name);
      case 'image':
        return t('catImage', cat.name);
      case 'pdf':
        return t('catPdf', cat.name);
      case 'convert':
        return t('catConvert', cat.name);
      case 'organize':
        return t('catOrganize', cat.name);
      default:
        return cat.name;
    }
  };

  const activeCategory = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
  const activeCategoryName = getCategoryName(activeCategory);

  const filteredTools = TOOLS.filter((tool) => {
    const matchesCategory =
      selectedCategory === 'all' || tool.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      query === '' ||
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.keywords.some((k) => k.toLowerCase().includes(query));

    return matchesCategory && matchesQuery;
  });

  const popularTools = TOOLS.filter((t) => t.popular);

  return (
    <div className="w-full space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-12 px-4 sm:px-6 lg:px-8 border-b border-base-300 bg-gradient-to-b from-base-100 to-base-200/40">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 shadow-sm animate-in fade-in duration-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('heroBadge', 'Fast, Free & 100% In-Memory Processing')}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-base-content leading-tight">
            {t('heroTitle', 'Free Online Image & PDF Tools')}
          </h1>

          <p className="text-base sm:text-lg text-base-content/75 max-w-2xl mx-auto leading-relaxed">
            {t('heroSubtitle', 'Compress, resize, convert, merge, split, and optimize your files in seconds. No signup required, zero storage, and 100% private.')}
          </p>

          {/* Quick Hero Search Input */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative flex items-center shadow-lg rounded-2xl bg-base-100 border border-base-300 overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Search className="w-5 h-5 text-base-content/40 ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('heroSearchPlaceholder', 'Search any tool (e.g. 10KB, compress, PNG to JPG, PDF merge)...')}
                className="w-full px-4 py-3.5 bg-transparent border-none outline-none text-sm sm:text-base text-base-content placeholder:text-base-content/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="btn btn-ghost btn-xs btn-circle mr-3"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Popular Search Shortcuts */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-base-content/60 pt-1">
            <span className="font-semibold text-base-content/70">{t('popularLabel', 'Popular:')}</span>
            <Link href="/compress-jpg-to-10kb" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              {t('compressJpg10kb', 'JPG to 10KB')}
            </Link>
            <Link href="/compress-jpg" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              {t('compressJpg', 'Compress JPG')}
            </Link>
            <Link href="/image-to-pdf" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              {t('imageToPdf', 'Image to PDF')}
            </Link>
            <Link href="/jpg-to-png" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              {t('jpgToPng', 'JPG to PNG')}
            </Link>
            <Link href="/pdf-to-jpg" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              {t('pdfToJpg', 'PDF to JPG')}
            </Link>
            <Link href="/merge-pdf" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              {t('mergePdf', 'Merge PDF')}
            </Link>
          </div>
        </div>
      </section>

      {/* Main Tools Showcase Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Mobile: Category Dropdown (left-aligned sleek filter pill) */}
        <div className="sm:hidden relative flex justify-start z-20" ref={categoryDropdownRef}>
          <button
            type="button"
            onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
            className="inline-flex items-center justify-between gap-3 px-3.5 py-2 bg-base-100 hover:bg-base-200/70 border border-base-300 hover:border-primary/40 rounded-xl shadow-sm text-xs font-bold text-base-content transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.98]"
            aria-expanded={isCategoryDropdownOpen}
            aria-label="Filter tools by category"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {getCategoryIcon(activeCategory.id)}
              </span>
              <span className="font-bold text-xs whitespace-nowrap">
                {activeCategoryName}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-base-200 text-base-content/70">
                {activeCategory.count}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-base-content/50 transition-transform duration-200 shrink-0 ${
                isCategoryDropdownOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu (flush with left-aligned button) */}
          {isCategoryDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 p-1.5 bg-base-100 border border-base-300 rounded-2xl shadow-xl space-y-1 animate-in fade-in zoom-in-95 duration-150 z-30">
              {CATEGORIES.map((cat) => {
                const catName = getCategoryName(cat);
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSearchQuery('');
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-base-content/80 hover:bg-base-200/80 active:bg-base-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`p-1 rounded-md ${isSelected ? 'text-white' : 'text-base-content/60'}`}>
                        {getCategoryIcon(cat.id)}
                      </span>
                      <span>{catName}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-base-200 text-base-content/60'
                        }`}
                      >
                        {cat.count}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop: Horizontal Category Tabs (hidden on mobile) */}
        <div className="hidden sm:flex items-center justify-center overflow-x-auto pb-2 gap-2 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const catName = getCategoryName(cat);
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`btn btn-sm rounded-xl whitespace-nowrap px-4 font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'btn-primary text-white shadow-md shadow-primary/20'
                    : 'btn-ghost bg-base-100 border border-base-300 text-base-content/70 hover:text-base-content'
                }`}
              >
                {catName} ({cat.count})
              </button>
            );
          })}
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.length > 0 ? (
            filteredTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)
          ) : (
            <div className="col-span-full py-16 text-center space-y-3 bg-base-100 rounded-3xl border border-base-300">
              <p className="text-base font-bold text-base-content">
                {t('noToolsMatching', 'No tools found matching')} &quot;{searchQuery}&quot;
              </p>
              <p className="text-xs text-base-content/60">
                {t('tryDifferentKeyword', 'Try a different keyword or reset filters to browse all tools.')}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="btn btn-primary btn-sm rounded-xl font-semibold mt-2"
              >
                {t('resetSearch', 'Reset Search')}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Monetization / Ad Slot */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdSlot slot="homepage-banner" format="banner" />
      </div>

      {/* Featured Capabilities & Target Size Engine highlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-base-100 border border-base-300 shadow-card grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="badge badge-primary badge-sm font-semibold">{t('specializedEngine', 'Specialized Engine')}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-base-content tracking-tight">
              {t('engineTitle', 'Intelligent Target-Size Image Compression')}
            </h2>
            <p className="text-sm text-base-content/75 leading-relaxed">
              {t('engineDesc1', 'Need to compress a JPG to strictly under 10KB, 20KB, or 50KB for government job portals, university admissions, UPSC/SSC forms, or visa applications?')}
            </p>
            <p className="text-sm text-base-content/75 leading-relaxed">
              {t('engineDesc2', 'Our smart optimization engine dynamically analyzes and optimizes your photos to guarantee your file meets strict portal size thresholds with crystal-clear visual quality.')}
            </p>

            <div className="pt-2 flex flex-wrap gap-2">
              <Link href="/compress-jpg-to-10kb" className="btn btn-primary btn-sm rounded-xl text-white font-bold gap-1.5 shadow-sm">
                {t('compressTo10kb', 'Compress to 10KB')} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/compress-jpg-to-20kb" className="btn btn-ghost btn-sm rounded-xl border border-base-300 font-semibold">
                {t('compressTo20kb', 'Compress to 20KB')}
              </Link>
              <Link href="/compress-jpg-to-50kb" className="btn btn-ghost btn-sm rounded-xl border border-base-300 font-semibold">
                {t('compressTo50kb', 'Compress to 50KB')}
              </Link>
            </div>
          </div>

          {/* Feature highlights badge grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-base-200/50 border border-base-200 space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                {t('feature1Title', 'Guaranteed Target Size')}
              </div>
              <p className="text-xs text-base-content/60">{t('feature1Desc', 'Hits your exact KB ceiling reliably.')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-base-200/50 border border-base-200 space-y-1">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                {t('feature2Title', 'Zero File Storage')}
              </div>
              <p className="text-xs text-base-content/60">{t('feature2Desc', 'Processed strictly in memory buffer.')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-base-200/50 border border-base-200 space-y-1">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                <Zap className="w-4 h-4" />
                {t('feature3Title', 'Sub-Second Speed')}
              </div>
              <p className="text-xs text-base-content/60">{t('feature3Desc', 'Optimized for instant browser response.')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-base-200/50 border border-base-200 space-y-1">
              <div className="flex items-center gap-2 text-violet-500 font-bold text-sm">
                <Lock className="w-4 h-4" />
                {t('feature4Title', 'No Signup or Watermark')}
              </div>
              <p className="text-xs text-base-content/60">{t('feature4Desc', '100% free with unlimited usage.')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Guarantee Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-base">
              <ShieldCheck className="w-5 h-5" />
              {t('privacySectionTitle', 'Your Privacy is Our Core Priority')}
            </div>
            <p className="text-xs sm:text-sm text-base-content/75 max-w-2xl leading-relaxed">
              {t('privacySectionDesc', 'We do not store, log, or share your uploaded images or PDF documents. All processing runs in ephemeral volatile memory and files are discarded immediately after your download.')}
            </p>
          </div>

          <Link href="/privacy" className="btn btn-outline btn-sm rounded-xl font-semibold shrink-0">
            {t('readPrivacyPolicy', 'Read Privacy Policy')}
          </Link>
        </div>
      </section>
    </div>
  );
}
