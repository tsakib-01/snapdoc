import React from 'react';
import Link from 'next/link';
import { ChevronRight, CheckCircle, Sparkles } from 'lucide-react';
import { ToolMeta, TOOLS } from '@/lib/config/tools';
import FAQSection from './FAQSection';
import AdSlot from './AdSlot';
import ToolCard from './ToolCard';

interface ToolLayoutProps {
  tool: ToolMeta;
  children: React.ReactNode;
  isWide?: boolean;
  noCardWrapper?: boolean;
}

export default function ToolLayout({ tool, children, isWide = false, noCardWrapper = false }: ToolLayoutProps) {
  const relatedTools = TOOLS.filter(
    (t) => t.id !== tool.id && (t.category === tool.category || t.popular)
  ).slice(0, 3);

  const baseUrl = 'https://snapdoc.app';
  const toolUrl = `${baseUrl}/${tool.slug}`;

  // Structured Data Schema.org Objects for Google Rich Results
  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name,
    description: tool.description,
    url: toolUrl,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'All (Web-based)',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList: tool.features,
    screenshot: `${baseUrl}/logo.png`,
    author: {
      '@type': 'Organization',
      name: 'SnapDoc',
      url: baseUrl,
      logo: `${baseUrl}/logo.png`,
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${tool.category.toUpperCase()} Tools`,
        item: `${baseUrl}/tools`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: tool.name,
        item: toolUrl,
      },
    ],
  };

  const faqSchema = tool.faqs && tool.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: tool.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  } : null;

  const howToSchema = tool.howTo && tool.howTo.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Use ${tool.name}`,
    description: tool.description,
    step: tool.howTo.map((item, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: `Step ${item.step}`,
      text: item.text,
      url: `${toolUrl}#step-${item.step}`,
    })),
  } : null;

  return (
    <>
      {/* Schema.org JSON-LD Structured Data for Google Search */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {howToSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
      )}

      <div className={`w-full ${isWide ? 'max-w-[1500px] px-1 sm:px-4 md:px-6 py-2 sm:py-6 space-y-2.5 sm:space-y-6' : 'max-w-5xl px-3 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-8'} mx-auto`}>
        {/* Tool Header */}
        <div className={`text-center ${isWide ? 'space-y-1 max-w-3xl' : 'space-y-2.5 max-w-3xl'} mx-auto px-1`}>
          {tool.badge && (
            <span className="badge badge-primary badge-sm font-semibold mb-1">
              {tool.badge}
            </span>
          )}
          <h1 className={`${isWide ? 'text-lg sm:text-2xl md:text-3xl lg:text-4xl' : 'text-2xl sm:text-4xl lg:text-5xl'} font-extrabold tracking-tight text-base-content`}>
            {tool.name}
          </h1>
          <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
            {tool.description}
          </p>
        </div>

        {/* Main Tool Interactive Sandbox */}
        {noCardWrapper ? (
          <div className="w-full">
            {children}
          </div>
        ) : (
          <div className={`w-full bg-base-100 rounded-2xl sm:rounded-3xl border border-base-300 shadow-card ${isWide ? 'p-1.5 sm:p-4 lg:p-6' : 'p-3 sm:p-6 lg:p-8'} transition-all`}>
            {children}
          </div>
        )}

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
                <li key={idx} id={`step-${item.step}`} className="flex items-start gap-3">
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
    </>
  );
}
