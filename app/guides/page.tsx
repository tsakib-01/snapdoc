'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, BookOpen, ArrowRight, Sparkles, Image, FileText, PenTool, FileSpreadsheet, Clock, ArrowUpRight } from 'lucide-react';
import { GUIDES, GuideCategory, GUIDE_CATEGORIES } from '@/lib/config/guides';

export default function GuidesIndexPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GuideCategory | 'all'>('all');

  const filteredGuides = useMemo(() => {
    return GUIDES.filter((guide) => {
      const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesCategory;

      const matchesSearch =
        guide.title.toLowerCase().includes(query) ||
        guide.shortDescription.toLowerCase().includes(query) ||
        guide.categoryLabel.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const featuredGuides = useMemo(() => {
    return GUIDES.filter((g) => g.featured);
  }, []);

  const getCategoryIcon = (cat: GuideCategory) => {
    switch (cat) {
      case 'image':
        return <Image className="w-4 h-4 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-purple-500" />;
      case 'esign':
        return <PenTool className="w-4 h-4 text-emerald-500" />;
      case 'document':
        return <FileSpreadsheet className="w-4 h-4 text-amber-500" />;
      default:
        return <BookOpen className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 space-y-12 sm:space-y-16">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>SnapDoc Learning Center</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-base-content">
          Guides & How-To Articles
        </h1>
        <p className="text-sm sm:text-base text-base-content/70 leading-relaxed max-w-2xl mx-auto">
          Learn how to compress, convert, edit, and optimize your images, PDFs, and documents with step-by-step tutorials, technical insights, and pro tips.
        </p>

        {/* Live Search Input */}
        <div className="pt-4 max-w-xl mx-auto relative">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-4 text-base-content/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides (e.g. compress jpg, merge pdf, eSign)..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-base-100 border border-base-300 shadow-sm text-sm text-base-content placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 px-2 py-1 text-xs text-base-content/50 hover:text-base-content"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center justify-center flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            selectedCategory === 'all'
              ? 'bg-primary text-primary-content shadow-md shadow-primary/20'
              : 'bg-base-200 hover:bg-base-300 text-base-content/80'
          }`}
        >
          All Guides ({GUIDES.length})
        </button>

        {GUIDE_CATEGORIES.map((cat) => {
          const count = GUIDES.filter((g) => g.category === cat.id).length;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-primary text-primary-content shadow-md shadow-primary/20'
                  : 'bg-base-200 hover:bg-base-300 text-base-content/80'
              }`}
            >
              {getCategoryIcon(cat.id)}
              <span>{cat.label}</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-base-300 text-base-content/60'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Featured Section (Shown when no search query and All categories selected) */}
      {!searchQuery && selectedCategory === 'all' && featuredGuides.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl sm:text-2xl font-bold text-base-content">
              Featured How-To Guides
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredGuides.slice(0, 3).map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group relative flex flex-col p-6 rounded-3xl bg-gradient-to-br from-base-100 to-base-200/50 border border-base-300 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(guide.category)}
                    <span className="text-xs font-bold uppercase tracking-wider text-base-content/60">
                      {guide.categoryLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-base-content/50">
                    <Clock className="w-3 h-3" />
                    <span>{guide.readTime}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-base-content group-hover:text-primary transition-colors leading-snug mb-2">
                  {guide.title}
                </h3>

                <p className="text-xs text-base-content/70 leading-relaxed mb-6 flex-1 line-clamp-3">
                  {guide.shortDescription}
                </p>

                <div className="flex items-center text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                  <span>Read full guide</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Guides Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-base-content">
            {selectedCategory === 'all' ? 'All Articles & Tutorials' : `${GUIDE_CATEGORIES.find(c => c.id === selectedCategory)?.label}`}
          </h2>
          <span className="text-xs text-base-content/50">
            Showing {filteredGuides.length} {filteredGuides.length === 1 ? 'guide' : 'guides'}
          </span>
        </div>

        {filteredGuides.length === 0 ? (
          <div className="text-center py-16 px-4 bg-base-100 rounded-3xl border border-base-300">
            <BookOpen className="w-12 h-12 text-base-content/30 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-base-content mb-1">No guides found</h3>
            <p className="text-xs text-base-content/60 max-w-sm mx-auto">
              We couldn't find any tutorials matching &ldquo;{searchQuery}&rdquo;. Try another search term or reset category filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group flex flex-col p-6 rounded-2xl bg-base-100 border border-base-300 shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    {getCategoryIcon(guide.category)}
                    <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/60">
                      {guide.categoryLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-base-content/50">
                    <Clock className="w-3 h-3" />
                    <span>{guide.readTime}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-base-content group-hover:text-primary transition-colors leading-snug mb-2">
                  {guide.title}
                </h3>

                <p className="text-xs text-base-content/70 leading-relaxed mb-6 flex-1 line-clamp-3">
                  {guide.shortDescription}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-base-200/80 text-xs">
                  <span className="text-[11px] text-base-content/50">
                    Updated {guide.updatedAt}
                  </span>
                  <span className="font-semibold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Read <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Popular Tools Callout Section */}
      <div className="p-8 sm:p-12 rounded-3xl bg-base-200/50 border border-base-300 space-y-6">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-base-content mb-2">
            Try Our Free Privacy-First Tools
          </h2>
          <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
            Every tutorial is backed by our instant in-browser utilities. 100% in-memory, free forever, no signup required.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: 'Compress JPG', slug: 'compress-jpg' },
            { name: 'JPG to 10KB', slug: 'compress-jpg-to-10kb' },
            { name: 'Merge PDF', slug: 'merge-pdf' },
            { name: 'Compress PDF', slug: 'compress-pdf' },
            { name: 'Sign PDF', slug: 'sign-pdf' },
            { name: 'PDF to JPG', slug: 'pdf-to-jpg' },
          ].map((tool) => (
            <Link
              key={tool.slug}
              href={`/${tool.slug}`}
              className="flex items-center justify-between p-3 rounded-xl bg-base-100 border border-base-300 hover:border-primary/50 text-xs font-semibold text-base-content group transition-colors"
            >
              <span>{tool.name}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-base-content/40 group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
