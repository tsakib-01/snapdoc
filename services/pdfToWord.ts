import fs from "fs/promises";
import path from "path";
import os from "os";
import { PDFParse } from "pdf-parse";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export class PdfToWordError extends Error {}

interface ConvertOptions {
  /** Absolute path to the input .pdf file */
  inputPath: string;
  /** Directory to write the converted .docx into */
  outputDir: string;
}

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

/**
 * Converts a .pdf file to .docx.
 * - First attempts high-fidelity Python engine (exact vector/layout/multilingual font preservation).
 * - Falls back to native Node text parser and docx builder.
 */
export async function convertPdfToWord({
  inputPath,
  outputDir,
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

  const baseName = path.basename(inputPath, ".pdf");
  const outputPath = path.join(outputDir, `${baseName}.docx`);
  const scriptPath = path.join(process.cwd(), "scripts", "convert_engine.py");

  // 1. Attempt High-Fidelity Python Engine
  try {
    await execFileAsync("python", [scriptPath, "pdf2docx", inputPath, outputPath], {
      timeout: 90000,
    });
    await fs.access(outputPath);
    return outputPath;
  } catch (pyErr: any) {
    console.warn("Python pdf2docx execution failed or fallback triggered:", pyErr.message);
  }

  // 2. Fallback to Node.js pdf-parse + docx generator
  const pdfBuffer = await fs.readFile(inputPath);
  let paragraphs: string[] = [];

  try {
    const parsed = await pdfParse(pdfBuffer);
    paragraphs = parsed.text
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);
  } catch (err: any) {
    throw new PdfToWordError(`Failed to parse PDF text: ${err.message}`);
  }

  if (paragraphs.length === 0) {
    paragraphs = ["(No extractable text layer found in PDF)"];
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
                  font: "Segoe UI",
                }),
              ],
            })
        ),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);

  return outputPath;
}

