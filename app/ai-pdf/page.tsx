import React from 'react';
import type { Metadata } from 'next';
import AiPdfTool from '@/components/tools/AiPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'AI PDF Assistant & Summarizer - Chat with PDF Online',
  description: 'Upload any PDF to get instant AI summaries, key takeaways, and ask questions directly in an interactive chat.',
};

export default function AiPdfPage() {
  const tool = {
    id: 'ai-pdf',
    name: 'AI PDF Assistant & Summarizer',
    slug: 'ai-pdf',
    description: 'Summarize lengthy documents, extract key insights, and chat with your PDF in real-time.',
    longDescription: 'Our AI PDF Assistant processes research papers, legal contracts, reports, and textbooks in memory to produce executive summaries, key bullet takeaways, and answer questions directly.',
    category: 'pdf' as const,
    badge: 'AI Powered',
    icon: 'Bot',
    popular: true,
    acceptedTypes: 'application/pdf',
    keywords: ['ai pdf', 'chat with pdf', 'pdf summarizer', 'ask pdf', 'ai document assistant', 'free ai pdf'],
    features: [
      'Instant executive summary & key takeaways',
      'Interactive Q&A chat with document context',
      'Automatic quiz and comprehension question generation',
      '100% In-memory processing with no account needed'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'View the instant executive summary and key points.' },
      { step: '3', text: 'Switch to the "Chat" tab to ask specific questions about the file.' }
    ],
    faqs: [
      {
        q: 'Do I need to sign up or provide an API key?',
        a: 'No! The AI PDF Assistant is 100% free and ready to use immediately without any login, account, or API key.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <AiPdfTool />
    </ToolLayout>
  );
}
