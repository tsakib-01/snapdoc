import React from 'react';
import type { Metadata } from 'next';
import AiPdfTool from '@/components/tools/AiPdfTool';
import ToolLayout from '@/components/ui/ToolLayout';

export const metadata: Metadata = {
  title: 'Chat with PDF - Free Interactive AI Document Chat',
  description: 'Ask questions, extract information, and converse with your PDF documents online for free.',
};

export default function ChatWithPdfPage() {
  const tool = {
    id: 'chat-with-pdf',
    name: 'Chat with PDF',
    slug: 'chat-with-pdf',
    description: 'Ask questions and get instant answers directly from your PDF document.',
    longDescription: 'Interact with any PDF document as if speaking with a research assistant. Ask for definitions, specific clauses, numbers, or summary paragraphs directly.',
    category: 'pdf' as const,
    badge: 'AI Powered',
    icon: 'MessageSquare',
    acceptedTypes: 'application/pdf',
    keywords: ['chat with pdf', 'ask pdf', 'talk to pdf', 'ai pdf reader'],
    features: [
      'Interactive chat interface with document memory',
      'Instant semantic context lookup',
      'No account or API subscription needed',
      'Zero document retention guarantee'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'Type any question in the chat input.' },
      { step: '3', text: 'Receive instant contextual answers derived from your text.' }
    ],
    faqs: [
      {
        q: 'Is my chat private?',
        a: 'Yes, all interactions are processed locally in your session memory with zero database logging.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <AiPdfTool defaultTab="chat" />
    </ToolLayout>
  );
}
