import { NextRequest, NextResponse } from 'next/server';
import { flattenPdfDocument, cropPdfDocument } from '@/lib/pdf/flattenPdf';
import { MAX_PDF_FILE_SIZE } from '@/lib/utils/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const action = formData.get('action') as string; // 'flatten' or 'crop'

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_PDF_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum 50MB size limit.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    let outputBytes: Uint8Array;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    let suffix = 'flattened';

    if (action === 'crop') {
      const top = parseFloat(formData.get('top') as string) || 20;
      const right = parseFloat(formData.get('right') as string) || 20;
      const bottom = parseFloat(formData.get('bottom') as string) || 20;
      const left = parseFloat(formData.get('left') as string) || 20;

      outputBytes = await cropPdfDocument(inputBuffer, { top, right, bottom, left });
      suffix = 'cropped';
    } else {
      outputBytes = await flattenPdfDocument(inputBuffer);
    }

    const base64Data = `data:application/pdf;base64,${Buffer.from(outputBytes).toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: `${baseName}_${suffix}.pdf`,
      size: outputBytes.length,
      mimeType: 'application/pdf',
      dataUrl: base64Data,
    });
  } catch (err: any) {
    console.error('Flatten/Crop PDF error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process PDF.' },
      { status: 500 }
    );
  }
}
