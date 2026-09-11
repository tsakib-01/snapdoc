import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { convertWithGotenbergOrLibreOffice, GotenbergError } from "./gotenberg";

const execFileAsync = promisify(execFile);

export class WordToPdfError extends Error {}

interface ConvertOptions {
  /** Absolute path to the input .docx or .doc file */
  inputPath: string;
  /** Directory to write the converted .pdf into */
  outputDir: string;
  /** Kill the LibreOffice/Gotenberg process if it hasn't finished by this time (ms) */
  timeoutMs?: number;
}

/**
 * Converts a .docx/.doc file to .pdf using:
 * 1. High-fidelity localized Python engine (Native Word COM -> LibreOffice -> Multilingual TrueType ReportLab).
 * 2. Fallback to Gotenberg API / system LibreOffice.
 */
export async function convertWordToPdf({
  inputPath,
  outputDir,
  timeoutMs = 60_000,
}: ConvertOptions): Promise<string> {
  try {
    await fs.access(inputPath);
  } catch {
    throw new WordToPdfError(`Input file not found: ${inputPath}`);
  }

  const ext = path.extname(inputPath).toLowerCase();
  if (ext !== ".docx" && ext !== ".doc") {
    throw new WordToPdfError(`Unsupported input extension "${ext}". Expected .docx or .doc`);
  }

  await fs.mkdir(outputDir, { recursive: true });
  const baseName = path.basename(inputPath, ext);
  const outputPath = path.join(outputDir, `${baseName}.pdf`);
  const scriptPath = path.join(process.cwd(), "scripts", "convert_engine.py");

  // 1. Attempt High-Fidelity Python Engine
  try {
    await execFileAsync("python", [scriptPath, "word2pdf", inputPath, outputPath], {
      timeout: timeoutMs,
    });
    await fs.access(outputPath);
    return outputPath;
  } catch (pyErr: any) {
    console.warn("Python word2pdf conversion fallback triggered:", pyErr.message);
  }

  // 2. Fallback to Gotenberg / LibreOffice
  try {
    return await convertWithGotenbergOrLibreOffice({
      inputPath,
      outputDir,
      timeoutMs,
    });
  } catch (err: any) {
    if (err instanceof GotenbergError) {
      throw new WordToPdfError(err.message);
    }
    throw new WordToPdfError(`Word to PDF conversion failed: ${err.message}`);
  }
}


