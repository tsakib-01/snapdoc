export type ConversionType = 'pdf-to-word' | 'pdf-to-excel' | 'word-to-pdf' | 'excel-to-pdf';

const REMOTE_API_URL = (
  process.env.NEXT_PUBLIC_CONVERSION_API_URL || 'https://snapdoc-qvmv.onrender.com'
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
function dataUrlToBlob(dataUrl: string, defaultMime = 'application/pdf'): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || defaultMime;
  const binary = atob(parts[1]);
  const len = binary.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8arr[i] = binary.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

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

  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1');

  // Helper for Next.js internal API route
  const tryNextApiRoute = async (): Promise<ConversionOutput | null> => {
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
          const blob = dataUrlToBlob(data.dataUrl, targetExt === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');
          const url = URL.createObjectURL(blob);
          const engineName = data.engine || 'High-Fidelity Document Engine';
          return {
            blob,
            filename: data.filename || expectedOutputFilename,
            url,
            size: blob.size,
            engineUsed: 'Next.js Fallback Engine',
            isPythonVerified: true,
            processor: engineName,
            durationMs: Date.now() - startTime,
            endpoint: routeEndpoint,
          };
        }
        if (data.error && !isLocal) {
          throw new Error(data.error);
        }
      }
    } catch (routeErr: any) {
      console.warn('Next.js API route attempt notice:', routeErr.message);
    }
    return null;
  };

  // 1. If running locally, prioritize the local API route for instant high-fidelity LibreOffice/Word COM rendering
  if (isLocal) {
    const localResult = await tryNextApiRoute();
    if (localResult) {
      return localResult;
    }
  }

  // 2. Direct Remote Python FastAPI Conversion (or localhost:5000 if available)
  const candidateUrls = [REMOTE_API_URL];
  if (isLocal) {
    candidateUrls.unshift('http://localhost:5000');
  }

  for (const apiUrl of candidateUrls) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s for Render free-tier wake up

      const endpointUrl = `${apiUrl}/api/convert/${type}`;
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
        console.warn(`Python API (${endpointUrl}) failed (${errDetail}), continuing fallback...`);
      }
    } catch (directErr: any) {
      console.warn(`Python API (${apiUrl}) connection notice:`, directErr.message);
    }
  }

  // 3. Next.js API Route Fallback (if not already completed)
  const fallbackResult = await tryNextApiRoute();
  if (fallbackResult) {
    return fallbackResult;
  }

  throw new Error('Conversion could not be completed. Please ensure your file is valid and try again.');
}
