import { NextRequest, NextResponse } from 'next/server';
import { convertTextToPdf, convertCsvToPdf } from '@/lib/office/documentConverter';
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
        return NextResponse.json({ error: 'File exceeds maximum size limit.' }, { status: 400 });
      }
      baseName = file.name.replace(/\.[^/.]+$/, '');
      const rawText = await file.text();

      if (format === 'csv' || file.name.endsWith('.csv')) {
        outputBytes = await convertCsvToPdf(rawText);
      } else {
        outputBytes = await convertTextToPdf(rawText, { title: baseName });
      }
    } else {
      if (format === 'csv') {
        outputBytes = await convertCsvToPdf(textContent);
      } else {
        outputBytes = await convertTextToPdf(textContent, { title: 'Converted Document' });
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
