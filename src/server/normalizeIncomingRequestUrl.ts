type IncomingRequestUrl = {
  url?: unknown;
  originalUrl?: unknown;
  _parsedUrl?: unknown;
  _parsedOriginalUrl?: unknown;
};

function normalizeTarget(target: string): string | null {
  if (target.startsWith("/")) return target;

  // Vercel's adapter may forward an absolute-form request target. Express 4's
  // parseurl fallback calls the deprecated url.parse() for these values.
  if (!target.includes("://")) return null;

  try {
    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    if (!parsed.hostname || parsed.username || parsed.password || parsed.hash)
      return null;

    const normalized = `${parsed.pathname || "/"}${parsed.search}`;
    return normalized.startsWith("/") ? normalized : null;
  } catch {
    return null;
  }
}

function parseQueryWithWhatwgUrl(target: string): Record<string, string | string[]> {
  const parsed = new URL(target, "http://localhost");
  const query = Object.create(null) as Record<string, string | string[]>;

  for (const [key, value] of parsed.searchParams) {
    const current = query[key];
    if (current === undefined) {
      query[key] = value;
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      query[key] = [current, value];
    }
  }

  return query;
}

/**
 * Normalize request targets and query data before they enter Express 4.
 *
 * Origin-form paths are left byte-for-byte unchanged. Absolute HTTP(S)
 * targets are converted with WHATWG URL. A precomputed own req.query property
 * also bypasses Vercel's IncomingMessage query getter, which internally calls
 * the deprecated url.parse() before Express route handlers execute.
 */
export function normalizeIncomingRequestUrl(
  request: IncomingRequestUrl,
): boolean {
  const rawUrl = request.url;
  const rawOriginalUrl = request.originalUrl;

  const normalizedUrl =
    typeof rawUrl === "string" ? normalizeTarget(rawUrl) : undefined;
  const normalizedOriginalUrl =
    typeof rawOriginalUrl === "string"
      ? normalizeTarget(rawOriginalUrl)
      : undefined;

  if (typeof rawUrl === "string" && normalizedUrl === null) return false;
  if (typeof rawOriginalUrl === "string" && normalizedOriginalUrl === null)
    return false;

  const urlChanged =
    typeof normalizedUrl === "string" && normalizedUrl !== rawUrl;
  const originalUrlChanged =
    typeof normalizedOriginalUrl === "string" &&
    normalizedOriginalUrl !== rawOriginalUrl;

  if (typeof normalizedUrl === "string") request.url = normalizedUrl;
  if (typeof normalizedOriginalUrl === "string")
    request.originalUrl = normalizedOriginalUrl;

  const queryTarget =
    typeof normalizedUrl === "string"
      ? normalizedUrl
      : typeof rawUrl === "string"
        ? rawUrl
        : typeof normalizedOriginalUrl === "string"
          ? normalizedOriginalUrl
          : typeof rawOriginalUrl === "string"
            ? rawOriginalUrl
            : "/";

  let query: Record<string, string | string[]>;
  try {
    query = parseQueryWithWhatwgUrl(queryTarget);
  } catch {
    return false;
  }

  Object.defineProperty(request, "query", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: query,
  });

  if (urlChanged) request._parsedUrl = undefined;
  if (originalUrlChanged) request._parsedOriginalUrl = undefined;

  return true;
}
