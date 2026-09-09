import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { PDFParse } from "pdf-parse";

// Wrapper for pdfParse function interface
async function pdfParse(pdfBuffer: Buffer): Promise<{ text: string; numpages: number }> {
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer), verbosity: 0 });
  try {
    const res = await parser.getText();
    return { text: res.text, numpages: res.total };
  } finally {
    await parser.destroy().catch(() => {});
  }
}
// @ts-ignore - pdf-poppler has no bundled types
import poppler from "pdf-poppler";
import { createWorker } from "tesseract.js";
import { Document, Packer, Paragraph, TextRun } from "docx";

export class PdfToWordError extends Error {}

interface ConvertOptions {
  /** Absolute path to the input .pdf file */
  inputPath: string;
  /** Directory to write the converted .docx into */
  outputDir: string;
  /**
   * If the extracted text layer has fewer characters than this per page
   * (on average), treat the PDF as scanned and fall back to OCR.
   */
  ocrThresholdCharsPerPage?: number;
}

/**
 * Converts a .pdf file to .docx.
 * - If the PDF has a real text layer, extracts it directly (fast, accurate).
 * - If the PDF looks like a scan (little/no extractable text), falls back to
 *   rendering each page as an image (via poppler) and running OCR (tesseract.js).
 *
 * Returns the absolute path to the generated DOCX.
 */
export async function convertPdfToWord({
  inputPath,
  outputDir,
  ocrThresholdCharsPerPage = 20,
}: ConvertOptions): Promise<string> {
  try {
    await fs.access(inputPath);
  } catch {
    throw new PdfToWordError(`Input file not found: ${inputPath}`);
  }

  if (path.extname(inputPath).toLowerCase() !== ".pdf") {
    throw new PdfToWordError(`Unsupported input extension. Expected .pdf`);
  }

  await fs.mkdir(outputDir, { recursive: true });

  const pdfBuffer = await fs.readFile(inputPath);
  let paragraphs: string[];

  try {
    const parsed = await pdfParse(pdfBuffer);
    const avgCharsPerPage = parsed.numpages > 0 ? parsed.text.length / parsed.numpages : 0;

    if (avgCharsPerPage >= ocrThresholdCharsPerPage) {
      // Real text layer present — use it directly.
      paragraphs = parsed.text
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
    } else {
      // Looks like a scanned PDF — fall back to OCR.
      paragraphs = await ocrPdf(inputPath);
    }
  } catch (err: any) {
    throw new PdfToWordError(`Failed to parse or OCR PDF: ${err.message}`);
  }

  if (paragraphs.length === 0) {
    throw new PdfToWordError(
      "No text could be extracted from this PDF, even after OCR fallback."
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 540,
              right: 540,
              bottom: 540,
              left: 540,
            },
          },
        },
        children: paragraphs.map(
          (text) =>
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text,
                  size: 22,
                  font: "Calibri",
                }),
              ],
            })
        ),
      },
    ],
  });

  const baseName = path.basename(inputPath, ".pdf");
  const outputPath = path.join(outputDir, `${baseName}.docx`);
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);

  return outputPath;
}

/**
 * Renders each page of a PDF to a PNG (via poppler's pdftoppm binding) and
 * runs Tesseract OCR on each image, returning one string per detected line.
 */
async function ocrPdf(inputPath: string): Promise<string[]> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-ocr-"));
  const imagePrefix = crypto.randomUUID();

  try {
    await poppler.convert(inputPath, {
      format: "png",
      out_dir: tmpDir,
      out_prefix: imagePrefix,
      page: null, // all pages
    });

    const files = (await fs.readdir(tmpDir))
      .filter((f) => f.startsWith(imagePrefix))
      .sort(); // pdftoppm zero-pads page numbers, so lexical sort == page order

    if (files.length === 0) {
      throw new PdfToWordError("Poppler produced no page images to OCR.");
    }

    const worker = await createWorker("eng");
    const lines: string[] = [];

    try {
      for (const file of files) {
        const { data } = await worker.recognize(path.join(tmpDir, file));
        const pageLines = data.text
          .split(/\r?\n/)
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0);
        lines.push(...pageLines);
      }
    } finally {
      await worker.terminate();
    }

    return lines;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
