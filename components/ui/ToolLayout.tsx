import React from 'react';
import Link from 'next/link';
import { ChevronRight, CheckCircle, HelpCircle, Sparkles } from 'lucide-react';
import { ToolMeta, TOOLS } from '@/lib/config/tools';
import FAQSection from './FAQSection';
import AdSlot from './AdSlot';
import ToolCard from './ToolCard';

interface ToolLayoutProps {
  tool: ToolMeta;
  children: React.ReactNode;
}

export default function ToolLayout({ tool, children }: ToolLayoutProps) {
  const relatedTools = TOOLS.filter(
    (t) => t.id !== tool.id && (t.category === tool.category || t.popular)
  ).slice(0, 3);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-base-content/60">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-base-content/40" />
        <Link href="/tools" className="hover:text-primary transition-colors capitalize">{tool.category} Tools</Link>
        <ChevronRight className="w-3.5 h-3.5 text-base-content/40" />
        <span className="font-semibold text-base-content truncate">{tool.name}</span>
      </nav>

      {/* Tool Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        {tool.badge && (
          <span className="badge badge-primary badge-sm font-semibold mb-1">
            {tool.badge}
          </span>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-base-content">
          {tool.name}
        </h1>
        <p className="text-sm sm:text-base text-base-content/70 leading-relaxed">
          {tool.description}
        </p>
      </div>

      {/* Main Tool Interactive Sandbox */}
      <div className="w-full bg-base-100 rounded-3xl border border-base-300 shadow-card p-4 sm:p-8 transition-all">
        {children}
      </div>

      {/* Top Banner Ad Placeholder */}
      <AdSlot slot="tool-page-middle" format="horizontal" />

      {/* SEO Explanatory Content & Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
        {/* Left: Deep Overview & Features */}
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-base-content">
            About {tool.name}
          </h2>
          <p className="text-xs sm:text-sm text-base-content/75 leading-relaxed">
            {tool.longDescription}
          </p>

          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-bold text-base-content uppercase tracking-wider">
              Key Features & Benefits
            </h3>
            <ul className="space-y-2">
              {tool.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-base-content/80">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: How to use step by step */}
        <div className="p-6 rounded-3xl bg-base-200/40 border border-base-300 space-y-4">
          <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            How to Use {tool.shortName || tool.name}
          </h3>
          <ol className="space-y-3">
            {tool.howTo.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </span>
                <p className="text-xs sm:text-sm text-base-content/80 leading-relaxed">
                  {item.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* FAQ Accordion */}
      {tool.faqs.length > 0 && <FAQSection faqs={tool.faqs} />}

      {/* Related Tools */}
      {relatedTools.length > 0 && (
        <div className="pt-8 border-t border-base-300 space-y-4">
          <h3 className="text-lg font-bold text-base-content">
            Explore Related Utilities
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedTools.map((rel) => (
              <ToolCard key={rel.id} tool={rel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
