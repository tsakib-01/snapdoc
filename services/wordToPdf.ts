import path from "path";
import fs from "fs/promises";
import { convertWithGotenbergOrLibreOffice, GotenbergError } from "./gotenberg";

export class WordToPdfError extends Error {}

interface ConvertOptions {
  /** Absolute path to the input .docx file */
  inputPath: string;
  /** Directory to write the converted .pdf into */
  outputDir: string;
  /** Kill the LibreOffice/Gotenberg process if it hasn't finished by this time (ms) */
  timeoutMs?: number;
}

/**
 * Converts a .docx/.doc file to .pdf using Gotenberg API or headless LibreOffice.
 * Returns the absolute path to the generated PDF.
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

