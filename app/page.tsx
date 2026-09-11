'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { TOOLS, CATEGORIES, ToolMeta } from '@/lib/config/tools';
import ToolCard from '@/components/ui/ToolCard';
import AdSlot from '@/components/ui/AdSlot';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
            <span>Fast, Free & 100% In-Memory Processing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-base-content leading-tight">
            Free Online <span className="text-primary bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">Image & PDF</span> Tools
          </h1>

          <p className="text-base sm:text-lg text-base-content/75 max-w-2xl mx-auto leading-relaxed">
            Compress, resize, convert, merge, split, and optimize your files in seconds. No signup required, zero storage, and 100% private.
          </p>

          {/* Quick Hero Search Input */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative flex items-center shadow-lg rounded-2xl bg-base-100 border border-base-300 overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Search className="w-5 h-5 text-base-content/40 ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any tool (e.g. 10KB, compress, PNG to JPG, PDF merge)..."
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
            <span className="font-semibold text-base-content/70">Popular:</span>
            <Link href="/compress-jpg-to-10kb" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              JPG to 10KB
            </Link>
            <Link href="/compress-jpg" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              Compress JPG
            </Link>
            <Link href="/image-to-pdf" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              Image to PDF
            </Link>
            <Link href="/jpg-to-png" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              JPG to PNG
            </Link>
            <Link href="/pdf-to-jpg" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              PDF to JPG
            </Link>
            <Link href="/merge-pdf" className="badge badge-ghost hover:badge-primary text-xs py-2.5 transition-colors">
              Merge PDF
            </Link>
          </div>
        </div>
      </section>

      {/* Main Tools Showcase Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Category Tabs */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 gap-2 no-scrollbar">
          {CATEGORIES.map((cat) => (
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
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.length > 0 ? (
            filteredTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)
          ) : (
            <div className="col-span-full py-16 text-center space-y-3 bg-base-100 rounded-3xl border border-base-300">
              <p className="text-base font-bold text-base-content">
                No tools found matching &quot;{searchQuery}&quot;
              </p>
              <p className="text-xs text-base-content/60">
                Try a different keyword or reset filters to browse all tools.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="btn btn-primary btn-sm rounded-xl font-semibold mt-2"
              >
                Reset Search
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
            <span className="badge badge-primary badge-sm font-semibold">Specialized Engine</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-base-content tracking-tight">
              Intelligent Target-Size Image Compression
            </h2>
            <p className="text-sm text-base-content/75 leading-relaxed">
              Need to compress a JPG to strictly under 10KB, 20KB, or 50KB for government job portals, university admissions, UPSC/SSC forms, or visa applications?
            </p>
            <p className="text-sm text-base-content/75 leading-relaxed">
              Our smart optimization engine dynamically analyzes and optimizes your photos to guarantee your file meets strict portal size thresholds with crystal-clear visual quality.
            </p>

            <div className="pt-2 flex flex-wrap gap-2">
              <Link href="/compress-jpg-to-10kb" className="btn btn-primary btn-sm rounded-xl text-white font-bold gap-1.5 shadow-sm">
                Compress to 10KB <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/compress-jpg-to-20kb" className="btn btn-ghost btn-sm rounded-xl border border-base-300 font-semibold">
                Compress to 20KB
              </Link>
              <Link href="/compress-jpg-to-50kb" className="btn btn-ghost btn-sm rounded-xl border border-base-300 font-semibold">
                Compress to 50KB
              </Link>
            </div>
          </div>

          {/* Feature highlights badge grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-base-200/50 border border-base-200 space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Guaranteed Target Size
              </div>
              <p className="text-xs text-base-content/60">Hits your exact KB ceiling reliably.</p>
            </div>

            <div className="p-4 rounded-2xl bg-base-200/50 border border-base-200 space-y-1">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                Zero File Storage
              </div>
              <p className="text-xs text-base-content/60">Processed strictly in memory buffer.</p>
            </div>

            <div className="p-4 rounded-2xl bg-base-200/50 border border-base-200 space-y-1">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                <Zap className="w-4 h-4" />
                Sub-Second Speed
              </div>
              <p className="text-xs text-base-content/60">Optimized for instant browser response.</p>
            </div>

            <div className="p-4 rounded-2xl bg-base-200/50 border border-base-200 space-y-1">
              <div className="flex items-center gap-2 text-violet-500 font-bold text-sm">
                <Lock className="w-4 h-4" />
                No Signup or Watermark
              </div>
              <p className="text-xs text-base-content/60">100% free with unlimited usage.</p>
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
              Your Privacy is Our Core Priority
            </div>
            <p className="text-xs sm:text-sm text-base-content/75 max-w-2xl leading-relaxed">
              We do not store, log, or share your uploaded images or PDF documents. All processing runs in ephemeral volatile memory and files are discarded immediately after your download.
            </p>
          </div>

          <Link href="/privacy" className="btn btn-outline btn-sm rounded-xl font-semibold shrink-0">
            Read Privacy Policy
          </Link>
        </div>
      </section>
    </div>
  );
}
