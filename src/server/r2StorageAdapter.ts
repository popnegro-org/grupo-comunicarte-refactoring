import crypto from 'crypto';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
]);

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

export interface StorageUploadInput { key: string; body: Buffer; contentType: string; }
export interface StorageAdapter {
  upload(input: StorageUploadInput): Promise<{ key: string; url: string }>;
  delete(key: string): Promise<void>;
  getAssetUrl(key: string, expiresInSeconds?: number): string;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}
function sha256(value: string | Buffer): string { return crypto.createHash('sha256').update(value).digest('hex'); }
function hmac(key: Buffer | string, value: string): Buffer { return crypto.createHmac('sha256', key).update(value).digest(); }
function encodePath(key: string): string { return key.split('/').map((part) => encodeURIComponent(part)).join('/'); }
export function isSafeSupportMediaKey(canonicalId: string, key: string): boolean {
  if (!key.startsWith(`soporte/${canonicalId}/`)) return false;
  return key.split('/').every((segment) => Boolean(segment) && segment !== '.' && segment !== '..' && !segment.includes('\\') && !segment.includes('\0'));
}

export function createPresignedGetUrl(input: { endpoint: string; bucket: string; accessKey: string; secretKey: string; key: string; expiresInSeconds?: number; now?: Date }): string {
  const expiresInSeconds = input.expiresInSeconds ?? 300;
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 600) {
    throw new Error('La expiración de URL firmada debe estar entre 1 y 600 segundos.');
  }
  const url = new URL(`${input.endpoint.replace(/\/$/, '')}/${encodePath(input.bucket)}/${encodePath(input.key)}`);
  const amzDate = (input.now ?? new Date()).toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${input.accessKey}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'host',
  };
  const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  const canonicalQuery = Object.keys(query).sort().map((name) => `${encode(name)}=${encode(query[name])}`).join('&');
  const canonicalRequest = ['GET', url.pathname, canonicalQuery, `host:${url.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)].join('\n');
  const kDate = hmac(`AWS4${input.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  url.search = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  return url.toString();
}

class CloudflareR2StorageAdapter implements StorageAdapter {
  private readonly endpoint: string;
  private readonly bucket: string;
  private readonly accessKey: string;
  private readonly secretKey: string;

  constructor() {
    const accountId = requiredEnv('R2_ACCOUNT_ID');
    this.endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    this.bucket = requiredEnv('R2_BUCKET_NAME');
    this.accessKey = requiredEnv('R2_ACCESS_KEY_ID');
    this.secretKey = requiredEnv('R2_SECRET_ACCESS_KEY');
  }

  getAssetUrl(key: string, expiresInSeconds = 300): string {
    return createPresignedGetUrl({ endpoint: this.endpoint, bucket: this.bucket, accessKey: this.accessKey, secretKey: this.secretKey, key, expiresInSeconds });
  }

  private async request(method: 'PUT' | 'DELETE', key: string, body?: Buffer, contentType?: string) {
    const url = `${this.endpoint}/${encodePath(this.bucket)}/${encodePath(key)}`;
    const parsed = new URL(url);
    const payloadHash = body ? sha256(body) : sha256('');
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const headers: Record<string, string> = {
      host: parsed.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };
    if (contentType) headers['content-type'] = contentType;
    const signedHeaders = Object.keys(headers).sort();
    const canonicalHeaders = signedHeaders.map((name) => `${name}:${headers[name].trim()}\n`).join('');
    const canonicalRequest = [method, parsed.pathname, parsed.search.slice(1), canonicalHeaders, signedHeaders.join(';'), payloadHash].join('\n');
    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)].join('\n');
    const kDate = hmac(`AWS4${this.secretKey}`, dateStamp);
    const kRegion = hmac(kDate, 'auto');
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`;
    const response = await fetch(url, { method, headers, body });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`R2 ${method} falló (${response.status}): ${detail.slice(0, 500)}`);
    }
  }

  async upload(input: StorageUploadInput): Promise<{ key: string; url: string }> {
    const contentType = input.contentType.toLowerCase();
    if (!ALLOWED_MEDIA_MIME_TYPES.has(contentType)) throw new Error(`MIME no permitido: ${contentType}.`);
    if (input.body.length === 0) throw new Error('El archivo está vacío.');
    if (input.body.length > MAX_UPLOAD_BYTES) throw new Error('El archivo excede el límite máximo permitido.');
    await this.request('PUT', input.key, input.body, contentType);
    return { key: input.key, url: `r2://${input.key}` };
  }

  async delete(key: string): Promise<void> { await this.request('DELETE', key); }
}

let adapter: CloudflareR2StorageAdapter | null = null;
export function getStorageAdapter(): StorageAdapter { return adapter ??= new CloudflareR2StorageAdapter(); }

export function createAssetKey(canonicalId: string, mimeType: string, role: 'cover' | 'gallery' = 'gallery'): string {
  const extension = EXTENSIONS[mimeType.toLowerCase()];
  if (!extension) throw new Error(`MIME no permitido: ${mimeType}.`);
  const safeId = canonicalId.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `soporte/${safeId}/${role}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
}

export { MAX_UPLOAD_BYTES };
