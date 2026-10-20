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
import GuideArticleView from '@/components/pages/GuideArticleView';

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
      title: 'Guide Not Found – JPGEASY',
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
      siteName: 'JPGEASY',
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
      name: 'JPGEASY',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'JPGEASY',
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

      {/* Localized Article View */}
      <GuideArticleView
        guide={guide}
        primaryTool={primaryTool}
        relatedGuides={relatedGuides}
        relatedTools={relatedTools}
      />
    </>
  );
}
