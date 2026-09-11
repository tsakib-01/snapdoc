# SnapDoc 🚀

> High-Speed, Privacy-First Online Image & PDF Tools.

SnapDoc is a modern, responsive web application for image and PDF processing. All file operations run **100% in-memory** with zero permanent disk storage, zero databases, and complete privacy.

---

## 🚀 Features & Utilities

### 📸 Image Tools
- **Target-Size Image Compressor**: Automatically compresses JPG/JPEG images down to exact target limits (**10KB, 20KB, 50KB, 100KB, 200KB, 500KB, 1MB, or Custom**) using an intelligent MozJPEG binary-search engine.
- **General Image Compressor**: Adjustable quality slider (1%–100%) for JPG, PNG, and WebP.
- **Image Resizer**: Exact pixel dimensions, aspect ratio lock, percentage scaling, and social media presets.
- **Image Cropper**: Interactive crop box with standard aspect ratios (1:1, 16:9, 4:3, 9:16) and custom pixel inputs.
- **Image Rotator & Flipper**: 90° left/right rotation, 180° flip, and horizontal/vertical mirroring.
- **Format Converters**: JPG ↔ PNG ↔ WebP (with custom transparency background colors).

### 📄 PDF Tools
- **Image to PDF / JPG to PDF**: Convert and combine multiple images into a PDF with page reordering, A4/Letter/Fit sizes, and custom margins.
- **PDF to JPG**: Extract high-resolution pages as individual JPEG images or download all as a ZIP archive.
- **Merge PDF**: Combine multiple PDF files into one clean document with drag-and-drop sequence ordering.
- **Split PDF**: Extract custom page ranges or separate every page into individual PDFs in a ZIP archive.
- **Compress PDF**: Optimize object streams and cross-reference tables in memory.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [DaisyUI](https://daisyui.com/)
- **Image Processing**: [Sharp](https://sharp.pixelplumbing.com/)
- **PDF Processing**: [pdf-lib](https://pdf-lib.js.org/) & [JSZip](https://stuk.github.io/jszip/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 💻 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 3. Build for Production
```bash
npm run build
npm start
```

---

## 🔒 Privacy Guarantee

- **No Database**: Files are never stored in any database.
- **In-Memory Execution**: Processing happens strictly in volatile memory buffers.
- **No Tracking**: No accounts, logins, or personal data collection.
