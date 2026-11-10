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
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(target)) return null;

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

/**
 * Normalize request targets before they enter Express 4.
 *
 * Origin-form paths are left byte-for-byte unchanged. Absolute HTTP(S)
 * targets are converted with WHATWG URL so Express/parseurl can use its
 * slash-prefixed fast path instead of the deprecated url.parse() fallback.
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

  if (urlChanged) request._parsedUrl = undefined;
  if (originalUrlChanged) request._parsedOriginalUrl = undefined;

  return true;
}
