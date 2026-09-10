import { NextRequest, NextResponse } from 'next/server';
import { convertWordToPdf } from '@/services/wordToPdf';
import { convertExcelToPdf as convertExcelToPdfService } from '@/services/excelToPdf';
import { convertTextToPdf, convertExcelToPdf, extractTextFromDocument } from '@/lib/office/documentConverter';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/validation';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc2pdf-api-'));
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
      const ext = path.extname(file.name).toLowerCase();

      // 1. If Word format, convert using convertWordToPdf
      if (ext === '.docx' || ext === '.doc') {
        try {
          const inputPath = path.join(tmpDir, file.name);
          await fs.writeFile(inputPath, fileBuffer);

          const outputPath = await convertWordToPdf({
            inputPath,
            outputDir: tmpDir,
          });

          const pdfBuf = await fs.readFile(outputPath);
          outputBytes = new Uint8Array(pdfBuf);
          const base64Data = `data:application/pdf;base64,${Buffer.from(outputBytes).toString('base64')}`;
          return NextResponse.json({
            success: true,
            filename: `${baseName}.pdf`,
            size: outputBytes.length,
            mimeType: 'application/pdf',
            dataUrl: base64Data,
          });
        } catch (wordErr) {
          console.warn('Word to PDF high-fidelity service error, falling back:', wordErr);
        }
      }

      // 2. If Excel / Spreadsheet format, convert using convertExcelToPdfService
      if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
        try {
          const inputPath = path.join(tmpDir, file.name);
          await fs.writeFile(inputPath, fileBuffer);

          const outputPath = await convertExcelToPdfService({
            inputPath,
            outputDir: tmpDir,
          });

          const pdfBuf = await fs.readFile(outputPath);
          outputBytes = new Uint8Array(pdfBuf);
          const base64Data = `data:application/pdf;base64,${Buffer.from(outputBytes).toString('base64')}`;
          return NextResponse.json({
            success: true,
            filename: `${baseName}.pdf`,
            size: outputBytes.length,
            mimeType: 'application/pdf',
            dataUrl: base64Data,
          });
        } catch (excelErr) {
          console.warn('Excel to PDF high-fidelity service error, falling back:', excelErr);
        }
      }

      // 3. Fallback to documentConverter
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
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
