'use client';

import React from 'react';
import ToolLayout from '@/components/ui/ToolLayout';
import CropPdfTool from '@/components/tools/CropPdfTool';

export default function CropPdfPage() {
  const tool = {
    id: 'crop-pdf',
    name: 'Crop PDF',
    slug: 'crop-pdf',
    description: 'Trim margins and crop page dimensions visually across all pages in your PDF document.',
    longDescription: 'Remove excess blank margins, cut headers and footers, or trim outer boundaries uniformly with a live visual preview studio in seconds.',
    category: 'pdf' as const,
    icon: 'Crop',
    acceptedTypes: 'application/pdf',
    keywords: ['crop pdf', 'trim pdf margins', 'resize pdf pages', 'cut pdf margins', 'visual pdf crop'],
    features: [
      'Interactive visual crop studio with live page previews',
      'Preset margin trims (Light, Standard, Deep, Header/Footer)',
      'Individual pixel sliders for top, bottom, left, and right margins',
      'Multi-page navigation and thumbnail inspection',
      'Lossless content preservation with zero server storage'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document to load the interactive visual crop studio.' },
      { step: '2', text: 'Select a quick margin preset or adjust top, bottom, left, and right sliders.' },
      { step: '3', text: 'Check the live green crop box on any page and click "Crop PDF Now" to download.' }
    ],
    faqs: [
      {
        q: 'Does cropping reduce PDF quality?',
        a: 'No! Cropping simply adjusts the visible page viewport boundaries (MediaBox/CropBox) without recompressing text or images.'
      },
      {
        q: 'Can I crop different margins on different sides?',
        a: 'Yes! You can independently set the top, bottom, left, and right margins in pixels.'
      }
    ]
  };

  return (
    <ToolLayout tool={tool}>
      <CropPdfTool />
    </ToolLayout>
  );
}

