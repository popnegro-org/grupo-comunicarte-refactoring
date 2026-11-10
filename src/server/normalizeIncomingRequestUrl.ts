/**
 * A serverless adapter may forward an absolute-form request target.
 * Express 4's parseurl dependency falls back to the deprecated url.parse()
 * for absolute URLs. Normalize before entering Express so routing uses the
 * origin-form pathname and query string with the WHATWG URL implementation.
 */
export function normalizeIncomingRequestUrl(request: { url?: string; originalUrl?: string }): boolean {
  const rawUrl = request.url;
  if (typeof rawUrl !== 'string' || !/^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl)) {
    return true;
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const normalized = `${parsed.pathname || '/'}${parsed.search}`;
    request.url = normalized;
    if (request.originalUrl === rawUrl) {
      request.originalUrl = normalized;
    }
    return true;
  } catch {
    return false;
  }
}
