import { pool } from '../src/db/index.ts';
import { SandboxIntegrationAdapter } from '../src/integrations/sandbox/adapter.ts';
import { processSandboxOutboxBatch } from '../src/server/integrationOutbox.ts';

if (process.env.INTEGRATION_OUTBOX_MODE !== 'sandbox') {
  throw new Error('INTEGRATION_OUTBOX_MODE debe ser exactamente "sandbox". No se ejecutará el procesador.');
}

try {
  const result = await processSandboxOutboxBatch(pool, new SandboxIntegrationAdapter());
  console.log(JSON.stringify(result));
} catch (error) {
  console.error('No se pudo procesar el lote sandbox:', error instanceof Error ? error.name : 'unknown');
  process.exitCode = 1;
} finally {
  await pool.end();
}
