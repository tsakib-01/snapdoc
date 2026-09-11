import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export class GotenbergError extends Error {}

interface GotenbergConvertOptions {
  /** Absolute path to the input Office file (.docx, .doc, .xlsx, .xls, .pptx) */
  inputPath: string;
  /** Directory to write the converted .pdf into */
  outputDir: string;
  /** Optional Gotenberg instance URL (defaults to process.env.GOTENBERG_URL or http://localhost:3000) */
  gotenbergUrl?: string;
  /** Timeout in ms */
  timeoutMs?: number;
}

/**
 * Searches for LibreOffice executable across standard Windows/Linux/macOS locations.
 */
async function findSofficePath(): Promise<string> {
  const candidatePaths = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.com",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files\\LibreOffice 7\\program\\soffice.com",
    "C:\\Program Files\\LibreOffice 7\\program\\soffice.exe",
    "C:\\Program Files\\LibreOffice 24\\program\\soffice.com",
    "C:\\Program Files\\LibreOffice 24\\program\\soffice.exe",
    "/usr/bin/soffice",
    "/usr/local/bin/soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  ];

  for (const p of candidatePaths) {
    try {
      await fs.access(p);
      return p;
    } catch {
      // Path does not exist, check next
    }
  }

  return "soffice"; // Default to PATH lookup
}

/**
 * Converts a document to PDF via Gotenberg HTTP API (if running) or falls back to local LibreOffice.
 */
export async function convertWithGotenbergOrLibreOffice({
  inputPath,
  outputDir,
  gotenbergUrl = process.env.GOTENBERG_URL || "http://localhost:3000",
  timeoutMs = 60_000,
}: GotenbergConvertOptions): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  const ext = path.extname(inputPath);
  const baseName = path.basename(inputPath, ext);
  const outputPath = path.join(outputDir, `${baseName}.pdf`);

  // 1. Try Gotenberg HTTP API if reachable
  try {
    const fileBuffer = await fs.readFile(inputPath);
    const fileName = path.basename(inputPath);

    const formData = new FormData();
    const blob = new Blob([fileBuffer]);
    formData.append("files", blob, fileName);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const endpoint = `${gotenbergUrl.replace(/\/$/, "")}/forms/libreoffice/convert`;
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const pdfArrayBuffer = await res.arrayBuffer();
      await fs.writeFile(outputPath, Buffer.from(pdfArrayBuffer));
      return outputPath;
    }
  } catch {
    // Gotenberg API not active, fall back to local engine
  }

  // 2. Fall back to local headless LibreOffice
  const sofficeBinary = await findSofficePath();

  try {
    await execFileAsync(
      sofficeBinary,
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
    throw new GotenbergError(`Document engine conversion failed: ${err.stderr || err.message}`);
  }

  try {
    await fs.access(outputPath);
    return outputPath;
  } catch {
    throw new GotenbergError(`Converted PDF was not generated at expected location: ${outputPath}`);
  }
}
