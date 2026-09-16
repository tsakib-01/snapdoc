import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  GUIDES,
  getGuideBySlug,
  getAllGuideSlugs,
  getRelatedGuides,
  GuideArticle,
} from '@/lib/config/guides';
import { getToolBySlug } from '@/lib/config/tools';
import ToolCard from '@/components/ui/ToolCard';
import FAQSection from '@/components/ui/FAQSection';
import {
  ArrowLeft,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  BookOpen,
  Info,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {
      title: 'Guide Not Found – SnapDoc',
    };
  }

  const canonicalUrl = `https://snapdoc.app/guides/${guide.slug}`;

  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      url: canonicalUrl,
      siteName: 'SnapDoc',
      locale: 'en_US',
      type: 'article',
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.metaTitle,
      description: guide.metaDescription,
    },
  };
}

export default async function GuideArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const relatedGuides = getRelatedGuides(guide.slug, 3);
  const primaryTool = getToolBySlug(guide.primaryToolSlug);
  const relatedTools = guide.relatedToolSlugs
    .map((s) => getToolBySlug(s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const baseUrl = 'https://snapdoc.app';
  const guideUrl = `${baseUrl}/guides/${guide.slug}`;

  // Article Schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.metaDescription,
    url: guideUrl,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'SnapDoc',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'SnapDoc',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': guideUrl,
    },
  };

  // FAQ Schema
  const faqSchema =
    guide.faqs && guide.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: guide.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.a,
            },
          })),
        }
      : null;

  const renderCalloutIcon = (type: 'tip' | 'info' | 'warning') => {
    switch (type) {
      case 'tip':
        return <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  const renderCalloutStyle = (type: 'tip' | 'info' | 'warning') => {
    switch (type) {
      case 'tip':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100';
      case 'warning':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100';
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-100';
    }
  };

  return (
    <>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* NOTE: Strictly NO breadcrumb navigation bar per site specification */}
      <article className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-10">
        {/* Back Link */}
        <div>
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 text-xs font-semibold text-base-content/60 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to all guides</span>
          </Link>
        </div>

        {/* Article Header */}
        <header className="max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge badge-primary badge-sm font-semibold">
              {guide.categoryLabel}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-base-content/50">
              <Clock className="w-3.5 h-3.5" />
              <span>{guide.readTime}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-base-content/50">
              <Calendar className="w-3.5 h-3.5" />
              <span>Updated {guide.updatedAt}</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-base-content leading-tight">
            {guide.title}
          </h1>

          <p className="text-base sm:text-lg text-base-content/80 leading-relaxed font-normal pt-2">
            {guide.introduction}
          </p>
        </header>

        {/* In-Content Primary Tool Callout Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <span className="text-[11px] uppercase font-bold tracking-wider text-primary">
              Recommended Free Online Tool
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-base-content">
              {guide.primaryToolName}
            </h3>
            <p className="text-xs sm:text-sm text-base-content/70">
              Process your files in memory directly in your browser with zero data retention or watermarks.
            </p>
          </div>

          <Link
            href={`/${guide.primaryToolSlug}`}
            className="btn btn-primary btn-md gap-2 font-semibold shadow-lg shadow-primary/25 shrink-0"
          >
            <span>{guide.primaryToolCtaText}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Main Content Grid: Article Sections + Sticky Table of Contents */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Article Body (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-12">
            {guide.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 space-y-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
                  {section.title}
                </h2>

                {section.paragraphs.map((p, idx) => (
                  <p key={idx} className="text-sm sm:text-base text-base-content/80 leading-relaxed">
                    {p}
                  </p>
                ))}

                {/* Optional Callout Box */}
                {section.callout && (
                  <div
                    className={`p-5 rounded-2xl border flex items-start gap-3.5 my-4 ${renderCalloutStyle(
                      section.callout.type
                    )}`}
                  >
                    {renderCalloutIcon(section.callout.type)}
                    <div className="space-y-1">
                      {section.callout.title && (
                        <h4 className="font-bold text-xs uppercase tracking-wider">
                          {section.callout.title}
                        </h4>
                      )}
                      <p className="text-xs sm:text-sm leading-relaxed">
                        {section.callout.text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Optional Step-by-Step Cards */}
                {section.steps && section.steps.length > 0 && (
                  <div className="space-y-3.5 pt-2">
                    {section.steps.map((step) => (
                      <div
                        key={step.number}
                        className="p-5 rounded-2xl bg-base-100 border border-base-300 flex items-start gap-4 shadow-sm"
                      >
                        <span className="w-8 h-8 rounded-xl bg-primary text-primary-content font-bold text-sm flex items-center justify-center shrink-0">
                          {step.number}
                        </span>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-base-content">
                            {step.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
                            {step.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional Bullet Points */}
                {section.bulletPoints && section.bulletPoints.length > 0 && (
                  <ul className="space-y-2 pt-2">
                    {section.bulletPoints.map((bp, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-base-content/80">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {/* Frequently Asked Questions */}
            {guide.faqs && guide.faqs.length > 0 && (
              <div id="frequently-asked-questions" className="scroll-mt-24 pt-6 border-t border-base-300">
                <div className="flex items-center gap-2 mb-6">
                  <HelpCircle className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-base-content">
                    Frequently Asked Questions
                  </h2>
                </div>
                <FAQSection faqs={guide.faqs} />
              </div>
            )}

            {/* Secondary In-Content CTA */}
            <div className="p-8 rounded-3xl bg-base-200/60 border border-base-300 text-center space-y-4">
              <h3 className="text-xl font-bold text-base-content">
                Ready to optimize your documents?
              </h3>
              <p className="text-xs sm:text-sm text-base-content/70 max-w-md mx-auto">
                Use SnapDoc's fast, free, and completely in-memory tools with no file upload limits or registration.
              </p>
              <Link
                href={`/${guide.primaryToolSlug}`}
                className="btn btn-primary btn-md gap-2 font-semibold"
              >
                <span>Launch {guide.primaryToolName}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Sticky Table of Contents & Quick Tools (4 cols on desktop) */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Table of Contents Card */}
              {guide.tableOfContents && guide.tableOfContents.length > 0 && (
                <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/60 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>Table of Contents</span>
                  </h3>
                  <nav className="space-y-1.5">
                    {guide.tableOfContents.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="block text-xs text-base-content/70 hover:text-primary hover:translate-x-0.5 transition-all py-1 leading-snug"
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Quick Launch Tool Card */}
              {primaryTool && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/10 to-base-100 border border-primary/20 space-y-3">
                  <span className="badge badge-primary badge-xs">Instant Tool</span>
                  <h4 className="font-bold text-sm text-base-content">
                    {primaryTool.name}
                  </h4>
                  <p className="text-xs text-base-content/70 leading-relaxed">
                    {primaryTool.description}
                  </p>
                  <Link
                    href={`/${primaryTool.slug}`}
                    className="btn btn-primary btn-sm w-full gap-2 mt-2"
                  >
                    <span>Open Tool</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Related Guides Section */}
        {relatedGuides.length > 0 && (
          <div className="pt-12 border-t border-base-300 space-y-6">
            <h3 className="text-xl sm:text-2xl font-bold text-base-content">
              Related Guides & Tutorials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedGuides.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/guides/${rel.slug}`}
                  className="group p-5 rounded-2xl bg-base-100 border border-base-300 hover:border-primary/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">
                      {rel.categoryLabel}
                    </span>
                    <h4 className="font-bold text-sm text-base-content group-hover:text-primary transition-colors leading-snug">
                      {rel.title}
                    </h4>
                    <p className="text-xs text-base-content/60 line-clamp-2">
                      {rel.shortDescription}
                    </p>
                  </div>
                  <div className="pt-3 text-xs font-semibold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Read guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Tools Section */}
        {relatedTools.length > 0 && (
          <div className="pt-8 border-t border-base-300 space-y-6">
            <h3 className="text-xl sm:text-2xl font-bold text-base-content">
              Helpful Tools Mentioned in This Guide
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
