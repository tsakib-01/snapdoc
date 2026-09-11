import fs from "fs/promises";
import path from "path";
import os from "os";

export type ConversionMode = 'pdf-to-word' | 'pdf-to-excel' | 'word-to-pdf' | 'excel-to-pdf' | 'compress-pdf';

interface RemoteConversionResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

const MIME_MAP: Record<ConversionMode, { ext: string; mime: string }> = {
  'pdf-to-word': {
    ext: '.docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  'pdf-to-excel': {
    ext: '.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  'word-to-pdf': {
    ext: '.pdf',
    mime: 'application/pdf',
  },
  'excel-to-pdf': {
    ext: '.pdf',
    mime: 'application/pdf',
  },
  'compress-pdf': {
    ext: '.pdf',
    mime: 'application/pdf',
  },
};

const DEFAULT_API_URL = 'https://snapdoc-qvmv.onrender.com';
const DEFAULT_API_KEY = 'snapdoc_sec_9f83a7b42e61c58d04e7';

/**
 * Checks if a remote Python Conversion API URL is configured.
 */
export function getRemoteApiConfig() {
  const apiUrl = (process.env.CONVERSION_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
  const apiKey = (process.env.CONVERSION_API_KEY || DEFAULT_API_KEY).trim();
  return {
    apiUrl: apiUrl || DEFAULT_API_URL,
    apiKey: apiKey || DEFAULT_API_KEY,
  };
}

/**
 * Executes document conversion via hosted Python FastAPI microservice.
 * Returns converted file buffer and metadata.
 */
export async function convertWithRemoteApi(
  mode: ConversionMode,
  fileBuffer: Buffer,
  originalFilename: string,
  extraFields?: Record<string, string>
): Promise<RemoteConversionResult | null> {
  const { apiUrl, apiKey } = getRemoteApiConfig();
  if (!apiUrl) {
    return null;
  }

  const endpoint = `${apiUrl}/api/convert/${mode}`;
  const baseName = originalFilename.replace(/\.[^/.]+$/, '');
  const targetExt = MIME_MAP[mode].ext;
  const expectedOutputName = `${baseName}${targetExt}`;

  const formData = new FormData();
  const fileBlob = new Blob([new Uint8Array(fileBuffer)]);
  formData.append('file', fileBlob, originalFilename);

  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      formData.append(k, v);
    }
  }

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s for Render spin-up

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `Remote Python API returned HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || errorDetail;
      } catch (_) {}
      throw new Error(errorDetail);
    }

    const arrayBuffer = await response.arrayBuffer();
    const resultBuffer = Buffer.from(arrayBuffer);

    return {
      buffer: resultBuffer,
      filename: expectedOutputName,
      mimeType: MIME_MAP[mode].mime,
    };
  } catch (err: any) {
    console.error(`Remote Python API conversion failed for ${mode}:`, err.message);
    throw err;
  }
}
