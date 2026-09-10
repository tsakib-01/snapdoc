export type ConversionType = 'pdf-to-word' | 'pdf-to-excel' | 'word-to-pdf' | 'excel-to-pdf';

const REMOTE_API_URL = (
  process.env.NEXT_PUBLIC_CONVERSION_API_URL || 'https://snapdoc-rj5w.onrender.com'
).replace(/\/+$/, '');

const REMOTE_API_KEY = (
  process.env.NEXT_PUBLIC_CONVERSION_API_KEY || 'snapdoc_sec_9f83a7b42e61c58d04e7'
).trim();

export interface ConversionOutput {
  blob: Blob;
  filename: string;
  url: string;
  size: number;
  engineUsed: 'Python FastAPI (Render Microservice)' | 'Next.js Fallback Engine';
  isPythonVerified: boolean;
  processor: string;
  durationMs: number;
  endpoint: string;
}

/**
 * Performs high-fidelity document conversion.
 * Directly calls the remote Python FastAPI microservice to bypass Vercel serverless
 * execution timeout & payload limits, with fallback to local Next.js API routes.
 */
export async function convertDocumentDirect(
  type: ConversionType,
  file: File
): Promise<ConversionOutput> {
  const startTime = Date.now();
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const extMap: Record<ConversionType, string> = {
    'pdf-to-word': '.docx',
    'pdf-to-excel': '.xlsx',
    'word-to-pdf': '.pdf',
    'excel-to-pdf': '.pdf',
  };
  const targetExt = extMap[type];
  const expectedOutputFilename = `${baseName}${targetExt}`;

  // 1. Direct High-Fidelity Remote Python Conversion
  try {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s for free-tier wake up

    const endpointUrl = `${REMOTE_API_URL}/api/convert/${type}`;
    const res = await fetch(endpointUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'x-api-key': REMOTE_API_KEY,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        const processorHeader = res.headers.get('x-conversion-processor') || 'PyMuPDF + python-docx / ReportLab';
        return {
          blob,
          filename: expectedOutputFilename,
          url,
          size: blob.size,
          engineUsed: 'Python FastAPI (Render Microservice)',
          isPythonVerified: true,
          processor: processorHeader,
          durationMs: Date.now() - startTime,
          endpoint: endpointUrl,
        };
      }
    } else {
      let errDetail = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || errDetail;
      } catch (_) {}
      console.warn(`Direct Python API failed (${errDetail}), attempting API route fallback...`);
    }
  } catch (directErr: any) {
    console.warn('Direct Python API connection notice:', directErr.message);
  }

  // 2. Next.js API Route Fallback
  try {
    const formData = new FormData();
    formData.append('file', file);

    const routeEndpoint = `/api/${type}`;
    const routeRes = await fetch(routeEndpoint, {
      method: 'POST',
      body: formData,
    });

    const contentType = routeRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await routeRes.json();
      if (routeRes.ok && data.dataUrl) {
        const resp = await fetch(data.dataUrl);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        return {
          blob,
          filename: data.filename || expectedOutputFilename,
          url,
          size: blob.size,
          engineUsed: 'Next.js Fallback Engine',
          isPythonVerified: false,
          processor: 'Node.js Converter Route',
          durationMs: Date.now() - startTime,
          endpoint: routeEndpoint,
        };
      }
      if (data.error) {
        throw new Error(data.error);
      }
    } else {
      const text = await routeRes.text();
      if (text.includes('<!DOCTYPE') || routeRes.status >= 500) {
        throw new Error(`Conversion backend is currently initializing. Please try again in a few seconds.`);
      }
    }
  } catch (routeErr: any) {
    throw new Error(routeErr.message || 'Conversion failed. Please try again.');
  }

  throw new Error('Conversion could not be completed. Please ensure your file is valid.');
}
