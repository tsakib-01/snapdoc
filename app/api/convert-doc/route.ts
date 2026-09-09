import { NextRequest, NextResponse } from 'next/server';
import { convertTextToPdf, convertExcelToPdf, extractTextFromDocument } from '@/lib/office/documentConverter';
import { convertWithLibreOffice } from '@/lib/office/libreofficeHelper';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const textContent = formData.get('textContent') as string;
    const format = (formData.get('format') as string) || 'txt';

    if (!file && !textContent) {
      return NextResponse.json({ error: 'No document or text provided.' }, { status: 400 });
    }

    let outputBytes: Uint8Array;
    let baseName = 'document';

    if (file) {
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        return NextResponse.json({ error: 'File exceeds maximum size limit (50MB).' }, { status: 400 });
      }
      baseName = file.name.replace(/\.[^/.]+$/, '');
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      // 1. Try LibreOffice headless conversion first for Office formats
      if (['.docx', '.doc', '.rtf', '.odt', '.xlsx', '.xls', '.pptx', '.ppt'].includes(ext)) {
        try {
          const pdfBuffer = await convertWithLibreOffice(fileBuffer, ext);
          if (pdfBuffer && pdfBuffer.length > 0) {
            outputBytes = new Uint8Array(pdfBuffer);
            const base64Data = `data:application/pdf;base64,${Buffer.from(outputBytes).toString('base64')}`;
            return NextResponse.json({
              success: true,
              filename: `${baseName}.pdf`,
              size: outputBytes.length,
              mimeType: 'application/pdf',
              dataUrl: base64Data,
            });
          }
        } catch (libreErr) {
          console.warn('LibreOffice headless conversion unavailable or failed, falling back:', libreErr);
        }
      }

      // 2. Fallback to high-fidelity document converter
      const { text: extractedText, isTable, buffer } = await extractTextFromDocument(file);

      if (isTable || format === 'csv' || ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
        outputBytes = await convertExcelToPdf(buffer || extractedText);
      } else {
        outputBytes = await convertTextToPdf(extractedText);
      }
    } else {
      if (format === 'csv') {
        outputBytes = await convertExcelToPdf(textContent);
      } else {
        outputBytes = await convertTextToPdf(textContent);
      }
    }

    const base64Data = `data:application/pdf;base64,${Buffer.from(outputBytes).toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: `${baseName}.pdf`,
      size: outputBytes.length,
      mimeType: 'application/pdf',
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Convert document error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to convert document to PDF.' },
      { status: 500 }
    );
  }
}
