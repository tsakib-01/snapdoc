'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Check,
  Minimize2,
  FileText,
  Crop,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { TOOLS, CATEGORIES } from '@/lib/config/tools';
import ToolCard from '@/components/ui/ToolCard';
import AdSlot from '@/components/ui/AdSlot';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function AllToolsPage() {
  const { t } = useLanguage();
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
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

  const activeCategory = CATEGORIES.find((c) => c.id === selectedCat) || CATEGORIES[0];
  const activeCategoryName = getCategoryName(activeCategory);

  const filtered = TOOLS.filter((t) => {
    const matchesCat = selectedCat === 'all' || t.category === selectedCat;
    const q = query.toLowerCase().trim();
    const matchesQ =
      q === '' ||
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.toLowerCase().includes(q));

    return matchesCat && matchesQ;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-base-content">
          {t('allToolsTitle', 'All Image & PDF Tools')}
        </h1>
        <p className="text-sm text-base-content/70">
          {t('allToolsSubtitle', `Browse our complete catalog of ${TOOLS.length} free online utilities.`)}
        </p>

        {/* Search */}
        <div className="pt-2">
          <div className="relative flex items-center rounded-2xl bg-base-100 border border-base-300 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="w-4 h-4 text-base-content/40 ml-4 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholderFull', 'Search by keyword, tool name, or feature...')}
              className="w-full px-4 py-3 bg-transparent border-none outline-none text-sm text-base-content"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="btn btn-ghost btn-xs btn-circle mr-3"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Category Dropdown (compact half-width pill selector) */}
      <div className="sm:hidden relative flex justify-center z-20" ref={categoryDropdownRef}>
        <button
          type="button"
          onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
          className="inline-flex items-center justify-between gap-3 px-3.5 py-2 bg-base-100 hover:bg-base-200/60 border border-base-300 rounded-2xl shadow-sm text-xs font-bold text-base-content transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.98]"
          aria-expanded={isCategoryDropdownOpen}
          aria-label="Filter tools by category"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-primary/10 text-primary shrink-0">
              {getCategoryIcon(activeCategory.id)}
            </span>
            <span className="font-bold text-xs whitespace-nowrap">
              {activeCategoryName}
            </span>
            <span className="badge badge-xs badge-ghost font-medium">
              {activeCategory.count}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-base-content/60 transition-transform duration-200 shrink-0 ${
              isCategoryDropdownOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isCategoryDropdownOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-1.5 bg-base-100 border border-base-300 rounded-2xl shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150 z-30">
            {CATEGORIES.map((cat) => {
              const catName = getCategoryName(cat);
              const isSelected = selectedCat === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCat(cat.id);
                    setQuery('');
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
              onClick={() => setSelectedCat(cat.id)}
              className={`btn btn-sm rounded-xl whitespace-nowrap px-4 font-semibold ${
                selectedCat === cat.id
                  ? 'btn-primary text-white shadow-md shadow-primary/20'
                  : 'btn-ghost bg-base-100 border border-base-300 text-base-content/70'
              }`}
            >
              {catName} ({cat.count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length > 0 ? (
          filtered.map((tool) => <ToolCard key={tool.id} tool={tool} />)
        ) : (
          <div className="col-span-full py-12 text-center text-base-content/60">
            {t('noToolsFound', 'No tools matched your criteria.')}
          </div>
        )}
      </div>

      <AdSlot slot="tools-directory-bottom" format="horizontal" />
    </div>
  );
}
