import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

export class WordToPdfError extends Error {}

interface ConvertOptions {
  /** Absolute path to the input .docx file */
  inputPath: string;
  /** Directory to write the converted .pdf into */
  outputDir: string;
  /** Kill the LibreOffice process if it hasn't finished by this time (ms) */
  timeoutMs?: number;
}

/**
 * Converts a .docx file to .pdf using headless LibreOffice.
 * Requires `soffice` to be on the system PATH (see LibreOffice install notes).
 *
 * Returns the absolute path to the generated PDF.
 */
export async function convertWordToPdf({
  inputPath,
  outputDir,
  timeoutMs = 60_000,
}: ConvertOptions): Promise<string> {
  // Validate input exists and looks like a docx
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

  try {
    await execFileAsync(
      "soffice",
      [
        "--headless",
        "--norestore",
        "--convert-to",
        "pdf",
        "--outdir",
        outputDir,
        inputPath,
      ],
      { timeout: timeoutMs }
    );
  } catch (err: any) {
    if (err.killed) {
      throw new WordToPdfError(
        `LibreOffice conversion timed out after ${timeoutMs}ms for file: ${inputPath}`
      );
    }
    throw new WordToPdfError(
      `LibreOffice conversion failed: ${err.stderr || err.message}`
    );
  }

  // LibreOffice names the output after the input file, same basename, .pdf extension
  const baseName = path.basename(inputPath, ext);
  const outputPath = path.join(outputDir, `${baseName}.pdf`);

  try {
    await fs.access(outputPath);
  } catch {
    throw new WordToPdfError(
      `Conversion reported success but output PDF was not found at ${outputPath}`
    );
  }

  return outputPath;
}
