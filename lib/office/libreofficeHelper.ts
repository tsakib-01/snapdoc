import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as libre from 'libreoffice-convert';

const execFileAsync = promisify(execFile);
const libreConvertAsync = promisify(libre.convert);

/**
 * Searches for LibreOffice binary across system PATH and standard OS installation directories.
 */
export async function findLibreOfficeBinary(): Promise<string | null> {
  const candidates = [
    // Windows
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    process.env.LIBREOFFICE_PATH || '',
    // Linux / Mac / PATH
    'soffice',
    'libreoffice',
    '/usr/bin/libreoffice',
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ].filter(Boolean);

  for (const binPath of candidates) {
    try {
      if (path.isAbsolute(binPath)) {
        await fs.access(binPath);
        return binPath;
      } else {
        const { stdout } = await execFileAsync(binPath, ['--version']);
        if (stdout) return binPath;
      }
    } catch {
      // Continue searching
    }
  }

  return null;
}

/**
 * Converts a document buffer (e.g. .docx, .doc, .rtf, .odt, .xlsx, .pptx) to PDF
 * using native LibreOffice CLI or libreoffice-convert.
 */
export async function convertWithLibreOffice(
  inputBuffer: Buffer,
  inputExt: string = '.docx'
): Promise<Buffer> {
  const binPath = await findLibreOfficeBinary();

  // If binary located directly, use isolated temp dir execution
  if (binPath) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc2pdf-'));
    const inputFilePath = path.join(tempDir, `source${inputExt.startsWith('.') ? inputExt : '.' + inputExt}`);
    const expectedOutputPdf = path.join(tempDir, `source.pdf`);

    try {
      await fs.writeFile(inputFilePath, inputBuffer);

      await execFileAsync(binPath, [
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        tempDir,
        inputFilePath,
      ]);

      const outputBuffer = await fs.readFile(expectedOutputPdf);
      return outputBuffer;
    } finally {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup failure
      }
    }
  }

  // Fallback to libreoffice-convert npm package
  return (await libreConvertAsync(inputBuffer, '.pdf', undefined)) as Buffer;
}
