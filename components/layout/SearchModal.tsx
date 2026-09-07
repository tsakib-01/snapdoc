'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X, ArrowRight, Sparkles, Layers, FileText, FileImage, Minimize2, Maximize2, Crop, RotateCw } from 'lucide-react';
import { TOOLS, ToolMeta } from '@/lib/config/tools';

const ICON_MAP: Record<string, React.ReactNode> = {
  Minimize2: <Minimize2 className="w-4 h-4 text-blue-500" />,
  Sparkles: <Sparkles className="w-4 h-4 text-amber-500" />,
  SlidersHorizontal: <Minimize2 className="w-4 h-4 text-indigo-500" />,
  Maximize2: <Maximize2 className="w-4 h-4 text-teal-500" />,
  Crop: <Crop className="w-4 h-4 text-emerald-500" />,
  RotateCw: <RotateCw className="w-4 h-4 text-violet-500" />,
  FlipHorizontal: <RotateCw className="w-4 h-4 text-purple-500" />,
  FileImage: <FileImage className="w-4 h-4 text-orange-500" />,
  Zap: <Sparkles className="w-4 h-4 text-amber-500" />,
  FileText: <FileText className="w-4 h-4 text-red-500" />,
  Image: <FileImage className="w-4 h-4 text-blue-500" />,
  Layers: <Layers className="w-4 h-4 text-cyan-500" />,
  Scissors: <Crop className="w-4 h-4 text-pink-500" />,
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open
          setQuery('');
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();
  const results = normalizedQuery === ''
    ? TOOLS.slice(0, 8) // show top popular tools by default
    : TOOLS.filter((tool) => {
        return (
          tool.name.toLowerCase().includes(normalizedQuery) ||
          tool.description.toLowerCase().includes(normalizedQuery) ||
          tool.category.toLowerCase().includes(normalizedQuery) ||
          tool.keywords.some((k) => k.toLowerCase().includes(normalizedQuery))
        );
      });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-base-300 gap-3">
          <Search className="w-5 h-5 text-base-content/40 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools (e.g. '10kb', 'convert png', 'merge pdf', 'resize')..."
            className="w-full bg-transparent border-none outline-none text-base-content placeholder:text-base-content/40 text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-base-content/40 hover:text-base-content hover:bg-base-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="btn btn-xs btn-ghost text-base-content/60 border border-base-300"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-base-200">
          {results.length > 0 ? (
            results.map((tool) => (
              <Link
                key={tool.id}
                href={`/${tool.slug}`}
                onClick={onClose}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-base-200/80 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-base-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {ICON_MAP[tool.icon] || <FileText className="w-4 h-4 text-primary" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-base-content group-hover:text-primary transition-colors">
                        {tool.name}
                      </span>
                      {tool.badge && (
                        <span className="badge badge-xs badge-primary font-medium">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-base-content/60 line-clamp-1">
                      {tool.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-base-content/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </Link>
            ))
          ) : (
            <div className="py-12 text-center text-base-content/50">
              <p className="text-sm font-medium">No tools found matching &quot;{query}&quot;</p>
              <p className="text-xs mt-1">Try searching for &quot;compress&quot;, &quot;pdf&quot;, &quot;convert&quot;, or &quot;10kb&quot;.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-base-200/50 border-t border-base-300 flex items-center justify-between text-xs text-base-content/50">
          <span>{TOOLS.length} total free online tools</span>
          <span className="hidden sm:inline">Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
