import { scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;

/**
 * Prefer an encoded scrypt hash. The legacy plaintext path remains only for a
 * staged credential migration; both paths compare equal-length bytes safely.
 * Format: scrypt$16384$<32-char-salt-hex>$<128-char-hash-hex>
 */
export function verifyAdminPassword(
  candidate: string,
  legacyPlaintext?: string,
  encodedHash?: string,
): boolean {
  if (encodedHash) {
    const [scheme, cost, saltHex, hashHex, extra] = encodedHash.split('$');
    if (
      scheme !== 'scrypt' ||
      cost !== String(SCRYPT_N) ||
      extra !== undefined ||
      !/^[a-f0-9]{32}$/i.test(saltHex || '') ||
      !/^[a-f0-9]{128}$/i.test(hashHex || '')
    ) return false;

    try {
      const expected = Buffer.from(hashHex, 'hex');
      const actual = scryptSync(candidate, Buffer.from(saltHex, 'hex'), SCRYPT_KEY_LENGTH, {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: 64 * 1024 * 1024,
      });
      return timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  if (typeof legacyPlaintext !== 'string') return false;
  const candidateBytes = Buffer.from(candidate, 'utf8');
  const expectedBytes = Buffer.from(legacyPlaintext, 'utf8');
  if (candidateBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(candidateBytes, expectedBytes);
}
