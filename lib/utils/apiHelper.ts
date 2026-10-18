/**
 * lib/utils/apiHelper.ts
 * Safe fetch helper that intercepts HTTP 413 "Request Entity Too Large", 504 timeouts,
 * and HTML error pages, preventing the notorious syntax error:
 * "Unexpected token 'R', 'Request En'... is not valid JSON".
 */

export async function safeFetchJson<T = any>(res: Response): Promise<T> {
  let textResponse = '';
  try {
    textResponse = await res.text();
  } catch {
    throw new Error('Unable to read server response. Please verify your connection.');
  }

  // 1. Intercept HTTP 413 "Request Entity Too Large"
  if (
    res.status === 413 ||
    textResponse.toLowerCase().includes('entity too large') ||
    textResponse.startsWith('Request Entity Too Large')
  ) {
    throw new Error(
      'The uploaded file is too large for server processing. Please use client-side processing or try a smaller file.'
    );
  }

  // 2. Intercept Gateway Timeouts (504)
  if (res.status === 504 || textResponse.toLowerCase().includes('gateway timeout')) {
    throw new Error(
      'The server timed out while processing this document. Please try again with a smaller file.'
    );
  }

  // 3. Intercept Bad Gateway (502)
  if (res.status === 502 || textResponse.toLowerCase().includes('bad gateway')) {
    throw new Error('The server is temporarily busy. Please try again in a moment.');
  }

  // 4. Attempt parsing JSON
  let data: any = null;
  try {
    data = JSON.parse(textResponse);
  } catch {
    if (!res.ok) {
      const cleanSnippet = textResponse.replace(/<[^>]*>?/gm, '').trim().slice(0, 160);
      throw new Error(cleanSnippet || `Server error (HTTP ${res.status}). Please try again.`);
    }
    throw new Error('Server returned an unexpected non-JSON response. Please try again.');
  }

  if (!res.ok || (data && data.success === false) || (data && data.error)) {
    throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
  }

  return data as T;
}
