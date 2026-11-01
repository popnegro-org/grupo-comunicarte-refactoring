const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeIdempotencyKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  return UUID_PATTERN.test(key) ? key : null;
}

export function requestIdFromIdempotencyKey(key: string, year = new Date().getFullYear()): string {
  return `REQ-${year}-${key}`;
}
