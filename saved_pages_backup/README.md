# Saved Pages Backup: Word-to-PDF & PDF-to-Word

This folder contains a complete backup of the Word to PDF and PDF to Word tools, routes, and components. They have been safely archived from the active website per user request and can be restored at any time.

## Files Archived
1. **Pages (Frontend UI)**:
   - saved_pages_backup/app/word-to-pdf/page.tsx -> app/word-to-pdf/page.tsx
   - saved_pages_backup/app/pdf-to-word/page.tsx -> app/pdf-to-word/page.tsx

2. **API Routes (Backend Handlers)**:
   - saved_pages_backup/app/api/word-to-pdf/route.ts -> app/api/word-to-pdf/route.ts
   - saved_pages_backup/app/api/pdf-to-word/route.ts -> app/api/pdf-to-word/route.ts

3. **Tool Components**:
   - saved_pages_backup/components/tools/WordToPdfTool.tsx -> components/tools/WordToPdfTool.tsx
   - saved_pages_backup/components/tools/PdfToWordTool.tsx -> components/tools/PdfToWordTool.tsx

## How to Restore Later
When you are ready to bring these tools back to the site:
1. Copy the files above back to their respective paths in app/ and components/tools/.
2. In lib/config/tools.ts, uncomment or re-add word-to-pdf and pdf-to-word in the TOOLS array.
3. In components/layout/Header.tsx and components/layout/Footer.tsx, re-add the menu links.
4. In next.config.mjs, remove the temporary redirects for /word-to-pdf and /pdf-to-word.
5. Run npm run build to verify compilation.
