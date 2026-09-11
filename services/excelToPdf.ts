import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { convertExcelToPdf as fallbackExcelToPdf } from "@/lib/office/documentConverter";

const execFileAsync = promisify(execFile);

export class ExcelToPdfError extends Error {}

interface ConvertOptions {
  /** Absolute path to the input .xlsx, .xls, or .csv file */
  inputPath: string;
  /** Directory to write the converted .pdf into */
  outputDir: string;
  /** Timeout in ms */
  timeoutMs?: number;
}

/**
 * Converts a spreadsheet (.xlsx, .xls, .csv) to .pdf using:
 * 1. High-fidelity localized Python engine (Excel COM / LibreOffice / openpyxl ReportLab with exact fills & typography).
 * 2. Fallback to client/server pdf-lib document converter.
 */
export async function convertExcelToPdf({
  inputPath,
  outputDir,
  timeoutMs = 60_000,
}: ConvertOptions): Promise<string> {
  try {
    await fs.access(inputPath);
  } catch {
    throw new ExcelToPdfError(`Input file not found: ${inputPath}`);
  }

  const ext = path.extname(inputPath).toLowerCase();
  if (ext !== ".xlsx" && ext !== ".xls" && ext !== ".csv") {
    throw new ExcelToPdfError(`Unsupported input extension "${ext}". Expected .xlsx, .xls, or .csv`);
  }

  await fs.mkdir(outputDir, { recursive: true });
  const baseName = path.basename(inputPath, ext);
  const outputPath = path.join(outputDir, `${baseName}.pdf`);
  const scriptPath = path.join(process.cwd(), "scripts", "convert_engine.py");

  // 1. Attempt High-Fidelity Python Engine
  try {
    await execFileAsync("python", [scriptPath, "excel2pdf", inputPath, outputPath], {
      timeout: timeoutMs,
    });
    await fs.access(outputPath);
    return outputPath;
  } catch (pyErr: any) {
    console.warn("Python excel2pdf conversion fallback triggered:", pyErr.message);
  }

  // 2. Fallback to documentConverter
  try {
    const fileBuffer = await fs.readFile(inputPath);
    const pdfBytes = await fallbackExcelToPdf(fileBuffer);
    await fs.writeFile(outputPath, Buffer.from(pdfBytes));
    return outputPath;
  } catch (err: any) {
    throw new ExcelToPdfError(`Excel to PDF conversion failed: ${err.message}`);
  }
}
