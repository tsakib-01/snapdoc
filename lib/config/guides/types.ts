export type GuideCategory = 'image' | 'pdf' | 'document' | 'esign';

export interface GuideSection {
  id: string;
  title: string;
  paragraphs: string[];
  callout?: {
    type: 'tip' | 'info' | 'warning';
    title?: string;
    text: string;
  };
  steps?: {
    number: number;
    title: string;
    text: string;
  }[];
  bulletPoints?: string[];
}

export interface GuideFaq {
  q: string;
  a: string;
}

export interface GuideArticle {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  shortDescription: string;
  category: GuideCategory;
  categoryLabel: string;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  featured?: boolean;
  primaryToolSlug: string;
  primaryToolName: string;
  primaryToolCtaText: string;
  relatedToolSlugs: string[];
  relatedGuideSlugs: string[];
  tableOfContents: { id: string; text: string }[];
  introduction: string;
  sections: GuideSection[];
  faqs: GuideFaq[];
}

export interface GuideCategoryMeta {
  id: GuideCategory;
  label: string;
  description: string;
  icon: string;
}

export const GUIDE_CATEGORIES: GuideCategoryMeta[] = [
  { id: 'image', label: 'Image Guides', description: 'Compression, resizing, and format conversions for JPG, PNG, and WebP.', icon: 'Image' },
  { id: 'pdf', label: 'PDF Guides', description: 'Merging, splitting, compressing, rotating, and managing PDF files.', icon: 'FileText' },
  { id: 'esign', label: 'eSign Guides', description: 'Electronic signatures, digital seals, and legally binding document verification.', icon: 'PenTool' },
  { id: 'document', label: 'Document Guides', description: 'Converting spreadsheets, OCR text extraction, and document workflows.', icon: 'FileSpreadsheet' },
];
