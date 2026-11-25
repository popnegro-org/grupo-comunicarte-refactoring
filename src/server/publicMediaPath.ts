const SAFE_PUBLIC_IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)$/i;

/**
 * Accept only same-origin static image assets under /images.
 * Encoded paths, traversal segments, protocol-relative URLs and query strings are rejected.
 */
export function isSafePublicImagePath(value: string): boolean {
  if (!value.startsWith('/images/')) return false;
  if (/[\\?#%]/.test(value)) return false;

  const segments = value.slice(1).split('/');
  if (segments.length < 2 || segments[0] !== 'images') return false;
  if (!segments.every((segment, index) => (
    index === 0 ? segment === 'images' : /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment)
  ))) return false;

  return SAFE_PUBLIC_IMAGE_EXTENSION.test(segments[segments.length - 1] || '');
}
