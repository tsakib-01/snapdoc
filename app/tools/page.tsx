'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles } from 'lucide-react';
import { TOOLS, CATEGORIES } from '@/lib/config/tools';
import ToolCard from '@/components/ui/ToolCard';
import AdSlot from '@/components/ui/AdSlot';

export default function AllToolsPage() {
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [query, setQuery] = useState<string>('');

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
          All Image & PDF Tools
        </h1>
        <p className="text-sm text-base-content/70">
          Browse our complete catalog of {TOOLS.length} free online utilities.
        </p>

        {/* Search */}
        <div className="pt-2">
          <div className="relative flex items-center rounded-2xl bg-base-100 border border-base-300 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="w-4 h-4 text-base-content/40 ml-4 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keyword, tool name, or feature..."
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

      {/* Categories */}
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 gap-2 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`btn btn-sm rounded-xl whitespace-nowrap px-4 font-semibold ${
              selectedCat === cat.id
                ? 'btn-primary text-white shadow-md shadow-primary/20'
                : 'btn-ghost bg-base-100 border border-base-300 text-base-content/70'
            }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length > 0 ? (
          filtered.map((tool) => <ToolCard key={tool.id} tool={tool} />)
        ) : (
          <div className="col-span-full py-12 text-center text-base-content/60">
            No tools matched your criteria.
          </div>
        )}
      </div>

      <AdSlot slot="tools-directory-bottom" format="horizontal" />
    </div>
  );
}
