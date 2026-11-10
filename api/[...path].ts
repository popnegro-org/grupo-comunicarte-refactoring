function useNeonPooler(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (!url.hostname.endsWith('.neon.tech')) return connectionString;
    if (url.hostname.includes('-pooler.')) return connectionString;

    const endpoint = url.hostname.split('.')[0];
    if (!endpoint.startsWith('ep-')) return connectionString;

    url.hostname = `${endpoint}-pooler.${url.hostname.split('.').slice(1).join('.')}`;
    return url.toString();
  } catch {
    return connectionString;
  }
}

const configuredDatabaseUrl = process.env.DATABASE_URL;
if (configuredDatabaseUrl) {
  process.env.DATABASE_URL = useNeonPooler(configuredDatabaseUrl);
}


const MAX_APP_BOOTSTRAP_ATTEMPTS = 3;
const APP_BOOTSTRAP_RETRY_DELAY_MS = 500;

function isRetryableBootstrapError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  const code = String(candidate.code ?? '');
  const message = String(candidate.message ?? '').toLowerCase();
  return code === '40P01'
    || code === 'ECONNRESET'
    || code === 'ETIMEDOUT'
    || code === 'ECONNREFUSED'
    || code === 'ENOTFOUND'
    || /deadlock detected|connection|timeout|econnreset|econnrefused|enotfound/.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (appPromise) return appPromise;

  appPromise = (async () => {
    const { createApp } = await import('../dist/server.cjs');
    for (let attempt = 1; attempt <= MAX_APP_BOOTSTRAP_ATTEMPTS; attempt += 1) {
      try {
        return await createApp();
      } catch (error) {
        if (attempt === MAX_APP_BOOTSTRAP_ATTEMPTS || !isRetryableBootstrapError(error)) {
          throw error;
        }
        console.warn(`Retryable API bootstrap failure; retrying (${attempt}/${MAX_APP_BOOTSTRAP_ATTEMPTS - 1})`);
        await sleep(APP_BOOTSTRAP_RETRY_DELAY_MS * attempt);
      }
    }
    throw new Error('API bootstrap failed after all retry attempts.');
  })().catch((error) => {
    appPromise = null;
    throw error;
  });

  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error: any) {
    console.error('Vercel API bootstrap failed:', error);
    return res.status(500).json({
      status: 'error',
      code: 'API_BOOTSTRAP_FAILED',
      message: 'No fue posible iniciar el servicio. Intentá nuevamente más tarde.',
    });
  }
}
