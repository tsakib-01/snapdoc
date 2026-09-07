export interface ToolMeta {
  id: string;
  name: string;
  shortName?: string;
  slug: string;
  description: string;
  longDescription: string;
  category: 'compress' | 'convert' | 'resize' | 'edit' | 'pdf';
  badge?: string;
  icon: string;
  popular?: boolean;
  acceptedTypes: string;
  maxFiles?: number;
  keywords: string[];
  features: string[];
  howTo: { step: string; text: string }[];
  faqs: { q: string; a: string }[];
}

export const TOOLS: ToolMeta[] = [
  // --- Compression Tools ---
  {
    id: 'compress-jpg',
    name: 'Compress JPG / JPEG',
    shortName: 'Compress JPG',
    slug: 'compress-jpg',
    description: 'Compress JPG images to a target file size or custom quality level while retaining maximum visual sharpness.',
    longDescription: 'Our intelligent JPG compressor reduces file sizes by up to 90% using advanced quantization and chroma subsampling. Choose between automatic target sizes (10KB, 20KB, 50KB, 100KB) or fine-tune with a precision quality slider.',
    category: 'compress',
    badge: 'Popular',
    icon: 'Minimize2',
    popular: true,
    acceptedTypes: 'image/jpeg,image/jpg',
    maxFiles: 10,
    keywords: ['compress jpg', 'jpg optimizer', 'reduce jpg size', 'compress jpeg', 'image shrinker', 'photo compressor'],
    features: [
      'Target-size engine (10KB, 20KB, 50KB, 100KB, 200KB, 500KB, 1MB, or Custom)',
      'Intelligent binary search quality optimization',
      'Instant side-by-side visual comparison',
      'Zero quality degradation with smart MozJPEG compression',
      '100% In-memory processing with complete privacy'
    ],
    howTo: [
      { step: '1', text: 'Select or drag & drop your JPG/JPEG image into the upload box.' },
      { step: '2', text: 'Choose your desired target size (e.g. 50KB) or set a custom quality percentage.' },
      { step: '3', text: 'Click "Compress JPG" to run the high-precision optimization.' },
      { step: '4', text: 'Preview the compressed image and click "Download JPG".' }
    ],
    faqs: [
      {
        q: 'How does the target-size compression work?',
        a: 'Our serverless engine uses an iterative binary search algorithm with MozJPEG. It optimizes compression tables and, if necessary, scales image dimensions proportionally to guarantee your image stays under the target size with the highest possible visual clarity.'
      },
      {
        q: 'Will compressing my JPG reduce quality noticeably?',
        a: 'Our smart compression removes invisible metadata and optimizes high-frequency color artifacts first, ensuring the image looks crisp and natural to the human eye.'
      },
      {
        q: 'Are my photos saved on your servers?',
        a: 'Never. All processing happens entirely in memory and is discarded immediately after sending the result back to your browser.'
      }
    ]
  },
  {
    id: 'compress-jpg-to-10kb',
    name: 'Compress JPG to 10KB',
    shortName: 'JPG to 10KB',
    slug: 'compress-jpg-to-10kb',
    description: 'Reduce JPG image size to 10KB or less for online forms, passports, signatures, job applications, and exam portals.',
    longDescription: 'Compress any JPG/JPEG image down to exactly 10KB or less without creating blurry artifacts. Ideal for government portals, college admissions, state PSC exams, UPSC, SSC, and passport signature requirements.',
    category: 'compress',
    badge: 'Specialized',
    icon: 'Sparkles',
    popular: true,
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    maxFiles: 5,
    keywords: ['compress jpg to 10kb', 'jpg 10kb', 'resize photo to 10kb', '10kb photo compressor', 'signature 10kb', 'compress image 10 kb'],
    features: [
      'Guaranteed file size under 10 KB',
      'Optimized for passport photos, signatures & exam portals',
      'Instant before & after size verification',
      'No registration or watermark'
    ],
    howTo: [
      { step: '1', text: 'Upload your photo, signature, or document image.' },
      { step: '2', text: 'The target is pre-configured to 10 KB.' },
      { step: '3', text: 'Click "Compress to 10KB" and watch our algorithm adapt quality and dimensions.' },
      { step: '4', text: 'Download your verified sub-10KB file immediately.' }
    ],
    faqs: [
      {
        q: 'Why do official portals require images under 10KB?',
        a: 'Government and academic portals enforce strict file size limits to save storage and speed up processing. Our tool ensures your image satisfies these requirements without rejection.'
      },
      {
        q: 'What if my original photo is very large (e.g. 5MB)?',
        a: 'Our algorithm automatically performs step-wise downscaling and quantization to safely bring 5MB+ photos down below 10KB.'
      }
    ]
  },
  {
    id: 'compress-jpg-to-20kb',
    name: 'Compress JPG to 20KB',
    shortName: 'JPG to 20KB',
    slug: 'compress-jpg-to-20kb',
    description: 'Compress JPG images to 20KB or less for portals, exam forms, ID cards, and web upload constraints.',
    longDescription: 'Quickly shrink photos, scanned certificates, and ID documents to 20KB or less. Perfect for online registration portals requiring 10KB–20KB uploads.',
    category: 'compress',
    icon: 'Minimize2',
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    keywords: ['compress jpg to 20kb', '20kb photo converter', 'resize image 20 kb', '20kb photo', 'passport 20kb'],
    features: [
      'Target 20 KB precision optimization',
      'Maintains legible text and facial clarity',
      '100% private in-memory processing'
    ],
    howTo: [
      { step: '1', text: 'Upload the image you need to reduce.' },
      { step: '2', text: 'Confirm 20 KB target size is selected.' },
      { step: '3', text: 'Click Compress and download the optimized image.' }
    ],
    faqs: [
      {
        q: 'Is 20KB enough for legible text?',
        a: 'Yes, our engine applies crisp edge preservation so ID numbers, names, and faces stay readable.'
      }
    ]
  },
  {
    id: 'compress-jpg-to-50kb',
    name: 'Compress JPG to 50KB',
    shortName: 'JPG to 50KB',
    slug: 'compress-jpg-to-50kb',
    description: 'Compress any JPG/JPEG image to 50KB or below for web optimization, visa applications, and portals.',
    longDescription: 'Compress your image to 50KB without noticeable quality loss. Perfect for visa applications, government forms, resumes, and high-speed web publishing.',
    category: 'compress',
    icon: 'Minimize2',
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    keywords: ['compress jpg to 50kb', '50kb photo compressor', 'resize photo to 50kb', 'visa photo 50kb'],
    features: [
      'Accurate 50 KB ceiling output',
      'Preserves color fidelity and sharpness',
      'Batch processing supported'
    ],
    howTo: [
      { step: '1', text: 'Upload your image.' },
      { step: '2', text: 'Click "Compress to 50KB".' },
      { step: '3', text: 'Download your 50KB JPG.' }
    ],
    faqs: [
      {
        q: 'Does this work on smartphones?',
        a: 'Yes, our tool is fully responsive and works smoothly on Android, iPhone, iPad, Mac, and Windows.'
      }
    ]
  },
  {
    id: 'compress-jpg-to-100kb',
    name: 'Compress JPG to 100KB',
    shortName: 'JPG to 100KB',
    slug: 'compress-jpg-to-100kb',
    description: 'Compress JPG images to 100KB or less with high visual clarity for websites and email attachments.',
    longDescription: 'Easily reduce large camera photos (3MB–10MB) to 100KB. Great for fast website loading, email attachments, and web stores.',
    category: 'compress',
    icon: 'Minimize2',
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    keywords: ['compress jpg to 100kb', '100kb image converter', 'shrink photo to 100kb'],
    features: ['Crisp 100KB output', 'Ideal for e-commerce and websites', 'Instant processing'],
    howTo: [
      { step: '1', text: 'Upload your JPG image.' },
      { step: '2', text: 'Click "Compress to 100KB".' },
      { step: '3', text: 'Download your optimized file.' }
    ],
    faqs: []
  },
  {
    id: 'compress-jpg-to-200kb',
    name: 'Compress JPG to 200KB',
    shortName: 'JPG to 200KB',
    slug: 'compress-jpg-to-200kb',
    description: 'Compress JPG images to 200KB or less for online forms, documents, and blogs.',
    longDescription: 'Bring high-resolution images down to 200KB while preserving pristine details, textures, and rich colors.',
    category: 'compress',
    icon: 'Minimize2',
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    keywords: ['compress jpg to 200kb', '200kb photo converter', 'shrink image to 200kb'],
    features: ['High quality 200KB output', 'Fast in-memory compression'],
    howTo: [
      { step: '1', text: 'Upload your image.' },
      { step: '2', text: 'Click "Compress to 200KB".' },
      { step: '3', text: 'Download the result.' }
    ],
    faqs: []
  },
  {
    id: 'compress-jpg-to-500kb',
    name: 'Compress JPG to 500KB',
    shortName: 'JPG to 500KB',
    slug: 'compress-jpg-to-500kb',
    description: 'Compress high-res photos to 500KB for quick social sharing and web publishing.',
    longDescription: 'Shrink multi-megapixel DSLR and smartphone photos to 500KB without losing sharpness.',
    category: 'compress',
    icon: 'Minimize2',
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    keywords: ['compress jpg to 500kb', '500kb photo compressor'],
    features: ['Retains near-lossless clarity', 'Ultra-fast conversion'],
    howTo: [
      { step: '1', text: 'Upload your file.' },
      { step: '2', text: 'Click "Compress to 500KB".' },
      { step: '3', text: 'Download your file.' }
    ],
    faqs: []
  },
  {
    id: 'compress-image',
    name: 'General Image Compressor',
    shortName: 'Compress Image',
    slug: 'compress-image',
    description: 'Compress JPG, PNG, and WebP images with custom quality settings, metadata stripping, and format flexibility.',
    longDescription: 'A versatile image compression utility supporting JPG, PNG, and WebP files. Adjust compression level from 1% to 100%, compare before/after results, and download instantly.',
    category: 'compress',
    badge: 'Multi-Format',
    icon: 'SlidersHorizontal',
    popular: true,
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    maxFiles: 10,
    keywords: ['compress image', 'png compressor', 'webp compressor', 'image optimizer', 'shrink photo'],
    features: [
      'Supports JPG, PNG, and WebP formats',
      'Live quality slider from 1% to 100%',
      'Strips unnecessary EXIF metadata to shave extra bytes',
      'Batch compression support'
    ],
    howTo: [
      { step: '1', text: 'Upload one or multiple JPG, PNG, or WebP images.' },
      { step: '2', text: 'Adjust the quality slider to your desired balance.' },
      { step: '3', text: 'Click "Compress Image" and preview the savings.' },
      { step: '4', text: 'Download single files or all as a ZIP archive.' }
    ],
    faqs: [
      {
        q: 'How does PNG compression work?',
        a: 'For PNG images, our engine uses 8-bit palette quantization and zlib level 9 compression to shrink file sizes up to 70% while preserving alpha transparency.'
      }
    ]
  },

  // --- Resizing & Transformation Tools ---
  {
    id: 'resize-image',
    name: 'Image Resizer',
    shortName: 'Resize Image',
    slug: 'resize-image',
    description: 'Resize image dimensions by pixels or percentage with aspect ratio lock and presets for social media.',
    longDescription: 'Easily resize JPG, PNG, and WebP images to exact pixel widths and heights, scale by percentage (e.g. 50%, 75%), or choose from popular presets for Instagram, YouTube, Facebook, and Twitter.',
    category: 'resize',
    badge: 'Popular',
    icon: 'Maximize2',
    popular: true,
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    maxFiles: 10,
    keywords: ['resize image', 'image resizer', 'change photo dimensions', 'scale image', 'pixel resizer', 'social media photo size'],
    features: [
      'Resize by exact width & height in pixels',
      'Maintain aspect ratio lock / unlock toggle',
      'Scale by percentage (25%, 50%, 75%, custom)',
      'Presets for Instagram, YouTube thumbnail, Facebook cover, Twitter header',
      'Lanczos3 high-quality resampling algorithm'
    ],
    howTo: [
      { step: '1', text: 'Upload your image to inspect current dimensions.' },
      { step: '2', text: 'Enter target width & height or select a quick preset.' },
      { step: '3', text: 'Toggle aspect ratio lock to prevent distortion.' },
      { step: '4', text: 'Click "Resize Image" and download the resized file.' }
    ],
    faqs: [
      {
        q: 'What resampling filter is used for resizing?',
        a: 'We use the Lanczos3 filter via Sharp, which provides the sharpest downsampling and cleanest upscaling available in modern image processing.'
      }
    ]
  },
  {
    id: 'crop-image',
    name: 'Image Cropper',
    shortName: 'Crop Image',
    slug: 'crop-image',
    description: 'Crop images freely or using standard aspect ratios (1:1, 16:9, 4:3, 9:16) with pixel precision.',
    longDescription: 'Crop any image with an intuitive interactive bounding box. Select custom dimensions or standard aspect ratios like 1:1 square for profile pictures or 16:9 for widescreen headers.',
    category: 'edit',
    icon: 'Crop',
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    keywords: ['crop image', 'image cropper', 'photo crop', 'cut image', 'square crop photo'],
    features: [
      'Interactive crop viewport',
      'Aspect ratio presets: 1:1 (Square), 16:9, 4:3, 3:2, 9:16 (Story)',
      'Manual pixel coordinate inputs',
      'Instant preview before downloading'
    ],
    howTo: [
      { step: '1', text: 'Upload the image you want to crop.' },
      { step: '2', text: 'Drag the crop handles or select an aspect ratio preset.' },
      { step: '3', text: 'Click "Crop Image" to apply the crop.' },
      { step: '4', text: 'Download your cropped picture.' }
    ],
    faqs: []
  },
  {
    id: 'rotate-image',
    name: 'Image Rotator',
    shortName: 'Rotate Image',
    slug: 'rotate-image',
    description: 'Rotate images 90° clockwise, 90° counter-clockwise, or 180° upside down with lossless quality.',
    longDescription: 'Fix sideways or upside-down photos instantly. Rotate left, rotate right, or flip upside-down without re-compression degradation.',
    category: 'edit',
    icon: 'RotateCw',
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    keywords: ['rotate image', 'turn photo 90 degrees', 'fix sideways photo', 'image rotator'],
    features: ['90° Left, 90° Right, 180° Rotate', 'Batch rotation support', 'Lossless rotation'],
    howTo: [
      { step: '1', text: 'Upload your image.' },
      { step: '2', text: 'Click the Rotate Left, Rotate Right, or 180° buttons.' },
      { step: '3', text: 'Download your rotated image.' }
    ],
    faqs: []
  },
  {
    id: 'flip-image',
    name: 'Image Flipper',
    shortName: 'Flip Image',
    slug: 'flip-image',
    description: 'Flip images horizontally (mirror effect) or vertically with a single click.',
    longDescription: 'Mirror your photos horizontally or flip them vertically upside-down. Perfect for fixing inverted selfies or creating reflective artistic effects.',
    category: 'edit',
    icon: 'FlipHorizontal',
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    keywords: ['flip image', 'mirror photo', 'flip image horizontally', 'flip image vertically'],
    features: ['Horizontal mirror flip', 'Vertical upside-down flip', 'Maintains 100% original quality'],
    howTo: [
      { step: '1', text: 'Upload your image.' },
      { step: '2', text: 'Select "Flip Horizontally" or "Flip Vertically".' },
      { step: '3', text: 'Download your mirrored image.' }
    ],
    faqs: []
  },

  // --- Format Conversion Tools ---
  {
    id: 'jpg-to-png',
    name: 'JPG to PNG Converter',
    shortName: 'JPG to PNG',
    slug: 'jpg-to-png',
    description: 'Convert JPG/JPEG images to lossless PNG format with zero quality loss.',
    longDescription: 'Convert JPG photos into high-definition PNG images. PNG format provides lossless compression, crisp lines, and compatibility with graphic design tools.',
    category: 'convert',
    badge: 'Popular',
    icon: 'FileImage',
    popular: true,
    acceptedTypes: 'image/jpeg,image/jpg',
    maxFiles: 10,
    keywords: ['jpg to png', 'convert jpg to png', 'jpeg to png converter', 'turn jpg into png'],
    features: ['Lossless PNG conversion', 'High color depth retention', 'Batch conversion with ZIP download'],
    howTo: [
      { step: '1', text: 'Upload your JPG or JPEG files.' },
      { step: '2', text: 'Click "Convert to PNG".' },
      { step: '3', text: 'Download your converted PNG files individually or as a ZIP.' }
    ],
    faqs: [
      {
        q: 'Why convert JPG to PNG?',
        a: 'PNG is a lossless format ideal for screenshots, digital art, text graphics, and editing where you want to prevent generation loss.'
      }
    ]
  },
  {
    id: 'png-to-jpg',
    name: 'PNG to JPG Converter',
    shortName: 'PNG to JPG',
    slug: 'png-to-jpg',
    description: 'Convert PNG images to JPG with custom background color for transparent areas.',
    longDescription: 'Convert transparent or opaque PNG images to lightweight JPGs. Choose a custom background color (white, black, or custom hex) to fill transparent pixels smoothly.',
    category: 'convert',
    badge: 'Popular',
    icon: 'FileImage',
    popular: true,
    acceptedTypes: 'image/png',
    maxFiles: 10,
    keywords: ['png to jpg', 'convert png to jpg', 'png to jpeg', 'change png to jpg with white background'],
    features: [
      'Smart transparency handling with background color selector',
      'Quality control slider',
      'Massive file size reduction compared to PNG',
      'Batch conversion support'
    ],
    howTo: [
      { step: '1', text: 'Upload your PNG image(s).' },
      { step: '2', text: 'Choose background color for transparent pixels (Default: White).' },
      { step: '3', text: 'Click "Convert to JPG" and download the result.' }
    ],
    faqs: [
      {
        q: 'What happens to transparent pixels in PNG when converting to JPG?',
        a: 'Because JPG does not support alpha transparency, transparent areas are automatically replaced with your chosen background color (default is clean white).'
      }
    ]
  },
  {
    id: 'jpg-to-webp',
    name: 'JPG to WebP Converter',
    shortName: 'JPG to WebP',
    slug: 'jpg-to-webp',
    description: 'Convert JPG/JPEG images to next-gen WebP format for 30%+ smaller file sizes and faster web pages.',
    longDescription: 'Upgrade your JPG photos to modern WebP format. WebP produces 30% smaller files than JPEG at equivalent visual quality, dramatically boosting Core Web Vitals and Google PageSpeed scores.',
    category: 'convert',
    icon: 'Zap',
    popular: true,
    acceptedTypes: 'image/jpeg,image/jpg',
    maxFiles: 10,
    keywords: ['jpg to webp', 'convert jpeg to webp', 'webp converter', 'modern web image format'],
    features: ['Next-gen WebP compression', 'Up to 35% smaller than JPEG', 'Perfect for web developers and bloggers'],
    howTo: [
      { step: '1', text: 'Upload your JPG images.' },
      { step: '2', text: 'Click "Convert to WebP".' },
      { step: '3', text: 'Download your optimized WebP images.' }
    ],
    faqs: []
  },
  {
    id: 'png-to-webp',
    name: 'PNG to WebP Converter',
    shortName: 'PNG to WebP',
    slug: 'png-to-webp',
    description: 'Convert PNG images to WebP while preserving full alpha transparency at much smaller file sizes.',
    longDescription: 'Convert bulky transparent PNGs into modern WebP format. WebP preserves 100% alpha transparency while cutting file sizes by up to 50%–70%.',
    category: 'convert',
    icon: 'Zap',
    acceptedTypes: 'image/png',
    maxFiles: 10,
    keywords: ['png to webp', 'convert transparent png to webp', 'webp transparency converter'],
    features: ['Full alpha channel preservation', 'Dramatic size reduction', 'Lossless or lossy WebP modes'],
    howTo: [
      { step: '1', text: 'Upload your PNG files.' },
      { step: '2', text: 'Click "Convert to WebP".' },
      { step: '3', text: 'Download your high-speed WebP files.' }
    ],
    faqs: []
  },
  {
    id: 'webp-to-jpg',
    name: 'WebP to JPG Converter',
    shortName: 'WebP to JPG',
    slug: 'webp-to-jpg',
    description: 'Convert WebP images back to universally compatible JPG/JPEG format for any device.',
    longDescription: 'Easily convert downloaded .webp web images into standard .jpg format so they open seamlessly in older photo viewers, Microsoft Office, and mobile galleries.',
    category: 'convert',
    icon: 'FileImage',
    acceptedTypes: 'image/webp',
    maxFiles: 10,
    keywords: ['webp to jpg', 'convert webp to jpeg', 'open webp as jpg', 'webp converter to jpg'],
    features: ['Universal device compatibility', 'Quality preservation', 'Batch conversion'],
    howTo: [
      { step: '1', text: 'Upload your WebP file(s).' },
      { step: '2', text: 'Click "Convert to JPG".' },
      { step: '3', text: 'Download your universally compatible JPGs.' }
    ],
    faqs: []
  },
  {
    id: 'webp-to-png',
    name: 'WebP to PNG Converter',
    shortName: 'WebP to PNG',
    slug: 'webp-to-png',
    description: 'Convert WebP images to PNG with full transparency and lossless quality.',
    longDescription: 'Convert WebP images into editable PNG files for Photoshop, Figma, Illustrator, and Canva while preserving transparency.',
    category: 'convert',
    icon: 'FileImage',
    acceptedTypes: 'image/webp',
    maxFiles: 10,
    keywords: ['webp to png', 'convert webp to png with transparency', 'webp to png transparent'],
    features: ['Lossless conversion', 'Transparent background preserved', 'Fast batch conversion'],
    howTo: [
      { step: '1', text: 'Upload WebP files.' },
      { step: '2', text: 'Click "Convert to PNG".' },
      { step: '3', text: 'Download your PNG files.' }
    ],
    faqs: []
  },

  // --- PDF Tools ---
  {
    id: 'image-to-pdf',
    name: 'Image to PDF Converter',
    shortName: 'Image to PDF',
    slug: 'image-to-pdf',
    description: 'Combine multiple JPG, PNG, and WebP images into a single professional PDF document.',
    longDescription: 'Create clean, high-resolution PDF documents from your pictures. Customize page size (A4, US Letter, Fit to Image), page orientation (Portrait, Landscape), and margins. Drag to reorder images effortlessly.',
    category: 'pdf',
    badge: 'Popular',
    icon: 'FileText',
    popular: true,
    acceptedTypes: 'image/jpeg,image/jpg,image/png,image/webp',
    maxFiles: 30,
    keywords: ['image to pdf', 'convert photos to pdf', 'combine images into pdf', 'jpg to pdf', 'png to pdf', 'make pdf from photos'],
    features: [
      'Supports JPG, PNG, and WebP images',
      'Drag & drop to reorder pages easily',
      'Page sizes: A4, US Letter, or Fit to Image dimensions',
      'Orientation: Portrait, Landscape, or Auto',
      'Adjustable margin options (None, Small, Large)',
      '100% In-memory PDF synthesis'
    ],
    howTo: [
      { step: '1', text: 'Upload one or multiple images.' },
      { step: '2', text: 'Drag images to rearrange their page order.' },
      { step: '3', text: 'Configure page size, orientation, and margin settings.' },
      { step: '4', text: 'Click "Generate PDF" and download your document.' }
    ],
    faqs: [
      {
        q: 'How many images can I merge into a PDF?',
        a: 'You can upload and convert up to 30 images at once in your browser without any watermarks or fees.'
      }
    ]
  },
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF Converter',
    shortName: 'JPG to PDF',
    slug: 'jpg-to-pdf',
    description: 'Convert single or multiple JPG images into a high-quality PDF document instantly.',
    longDescription: 'Turn scanned receipts, assignments, photo albums, and documents into a clean PDF with custom page formatting and zero quality loss.',
    category: 'pdf',
    icon: 'FileText',
    popular: true,
    acceptedTypes: 'image/jpeg,image/jpg',
    maxFiles: 30,
    keywords: ['jpg to pdf', 'convert jpeg to pdf', 'combine jpg to pdf', 'photos to pdf document'],
    features: ['A4 & Letter standard formats', 'Reorder pages', 'Fast in-memory processing'],
    howTo: [
      { step: '1', text: 'Upload your JPG images.' },
      { step: '2', text: 'Arrange page sequence if needed.' },
      { step: '3', text: 'Click "Convert to PDF" and download.' }
    ],
    faqs: []
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG Converter',
    shortName: 'PDF to JPG',
    slug: 'pdf-to-jpg',
    description: 'Extract PDF pages as high-resolution JPG images. Download individual pages or all as a ZIP.',
    longDescription: 'Convert any PDF document into crisp, high-resolution JPEG images. Render all pages or select specific page numbers, preview them in the browser, and download individually or packaged in a ZIP archive.',
    category: 'pdf',
    badge: 'Popular',
    icon: 'Image',
    popular: true,
    acceptedTypes: 'application/pdf',
    maxFiles: 1,
    keywords: ['pdf to jpg', 'convert pdf to image', 'extract pages from pdf to jpg', 'pdf to jpeg converter', 'pdf to photo'],
    features: [
      'High DPI page rendering for crisp text and graphics',
      'Select all pages or specific page ranges (e.g. 1, 3-5)',
      'Preview every extracted page directly in the browser',
      'Download individual images or all pages as a ZIP'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'Choose to convert all pages or specific pages.' },
      { step: '3', text: 'Click "Convert PDF to JPG".' },
      { step: '4', text: 'Preview extracted pages and download individual JPGs or the full ZIP.' }
    ],
    faqs: [
      {
        q: 'What resolution are the extracted JPGs?',
        a: 'Pages are rendered at high resolution (150–300 DPI) to ensure sharp readability of all text, charts, and embedded images.'
      }
    ]
  },
  {
    id: 'merge-pdf',
    name: 'Merge PDF Files',
    shortName: 'Merge PDF',
    slug: 'merge-pdf',
    description: 'Combine multiple PDF files into one consolidated PDF document in the exact order you want.',
    longDescription: 'Merge two or more PDF files into a single unified document. Drag and drop PDF cards to reorder documents before merging.',
    category: 'pdf',
    badge: 'Popular',
    icon: 'Layers',
    popular: true,
    acceptedTypes: 'application/pdf',
    maxFiles: 20,
    keywords: ['merge pdf', 'combine pdf', 'join pdf files', 'pdf binder', 'merge pdfs online free'],
    features: [
      'Combine up to 20 PDF documents into one',
      'Drag-and-drop to reorder files',
      'Preserves original page orientation, bookmarks, and links',
      'Instant client & serverless processing'
    ],
    howTo: [
      { step: '1', text: 'Upload two or more PDF files.' },
      { step: '2', text: 'Drag the files to put them in the desired order.' },
      { step: '3', text: 'Click "Merge PDF".' },
      { step: '4', text: 'Download your combined PDF document.' }
    ],
    faqs: [
      {
        q: 'Is there a page limit for merging PDFs?',
        a: 'You can merge documents containing hundreds of pages. The processing occurs smoothly without watermarks.'
      }
    ]
  },
  {
    id: 'split-pdf',
    name: 'Split PDF Pages',
    shortName: 'Split PDF',
    slug: 'split-pdf',
    description: 'Extract specific pages or page ranges from a PDF, or split all pages into separate PDF files.',
    longDescription: 'Separate one or more pages from your PDF document. Extract custom page ranges (e.g. 1-3, 5, 8-10) or split every single page into an individual PDF packed in a convenient ZIP file.',
    category: 'pdf',
    icon: 'Scissors',
    popular: true,
    acceptedTypes: 'application/pdf',
    maxFiles: 1,
    keywords: ['split pdf', 'extract pdf pages', 'separate pdf pages', 'split pdf online free', 'cut pdf'],
    features: [
      'Extract custom page ranges (e.g. 1-4, 7, 9-12)',
      'Split every page into separate individual PDF files',
      'Interactive page preview and selection',
      'ZIP download for multi-file splits'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'Specify the page numbers or ranges you want to extract.' },
      { step: '3', text: 'Click "Split PDF".' },
      { step: '4', text: 'Download your extracted PDF or ZIP archive.' }
    ],
    faqs: [
      {
        q: 'How do I specify page ranges?',
        a: 'You can enter comma-separated numbers and hyphens, for example "1-3, 5, 8-10" to extract pages 1, 2, 3, 5, 8, 9, and 10.'
      }
    ]
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF File',
    shortName: 'Compress PDF',
    slug: 'compress-pdf',
    description: 'Reduce PDF file size by optimizing stream structures and compressing internal objects.',
    longDescription: 'Optimize and shrink your PDF document size for email sharing and online submissions. Strips duplicate fonts, compresses metadata streams, and optimizes internal object dictionaries.',
    category: 'pdf',
    icon: 'Minimize2',
    acceptedTypes: 'application/pdf',
    maxFiles: 5,
    keywords: ['compress pdf', 'reduce pdf size', 'shrink pdf', 'pdf optimizer', 'make pdf smaller'],
    features: [
      'PDF object and cross-reference stream compression',
      'Removes unreferenced redundant data',
      'Real-time before/after file size calculation',
      'Preserves original formatting and text vectors'
    ],
    howTo: [
      { step: '1', text: 'Upload your PDF document.' },
      { step: '2', text: 'Click "Compress PDF".' },
      { step: '3', text: 'Review the file size savings and download your optimized PDF.' }
    ],
    faqs: [
      {
        q: 'Does compressing PDF affect text sharpness?',
        a: 'No, vector text and font curves remain perfectly crisp and sharp at any zoom level.'
      }
    ]
  }
];

export const CATEGORIES = [
  { id: 'all', name: 'All Tools', count: TOOLS.length },
  { id: 'compress', name: 'Compression', count: TOOLS.filter(t => t.category === 'compress').length },
  { id: 'convert', name: 'Conversion', count: TOOLS.filter(t => t.category === 'convert').length },
  { id: 'resize', name: 'Resize & Scale', count: TOOLS.filter(t => t.category === 'resize').length },
  { id: 'edit', name: 'Crop & Rotate', count: TOOLS.filter(t => t.category === 'edit').length },
  { id: 'pdf', name: 'PDF Tools', count: TOOLS.filter(t => t.category === 'pdf').length },
];

export function getToolBySlug(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
