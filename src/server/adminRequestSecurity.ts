export const ADMIN_COOKIE = 'gc_admin_token';

export function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const rawValue = part.slice(idx + 1).trim();
    if (!key) return acc;
    try {
      acc[key] = decodeURIComponent(rawValue);
    } catch {
      // Ignore malformed cookie values instead of turning an unauthenticated
      // request into a server error.
    }
    return acc;
  }, {});
}

type RequestHeaders = Record<string, unknown>;

export function adminAuthHeader(headers: RequestHeaders): string | undefined {
  const auth = headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth;
  const cookies = parseCookies(typeof headers.cookie === 'string' ? headers.cookie : undefined);
  const token = cookies[ADMIN_COOKIE];
  return token ? `Bearer ${token}` : undefined;
}

/** Cookie-authenticated state changes require a same-origin Origin header.
 * Bearer-token clients are not subject to browser cookie CSRF rules.
 */
export function hasValidAdminMutationOrigin(
  headers: RequestHeaders,
  method: string,
  allowedOrigins: string[],
): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return true;
  const authorization = headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) return true;
  const cookies = parseCookies(typeof headers.cookie === 'string' ? headers.cookie : undefined);
  if (!cookies[ADMIN_COOKIE]) return true;
  const origin = headers.origin;
  return typeof origin === 'string' && allowedOrigins.includes(origin);
}
