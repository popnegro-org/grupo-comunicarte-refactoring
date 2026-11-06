export type IntegrationProvider = 'sandbox' | 'hubspot';
export type IntegrationOutboxStatus = 'pending' | 'processing' | 'delivered' | 'retryable_error' | 'permanent_error';
export type IntegrationPayloadValue = string | number | boolean | null;

export interface IntegrationOutboxEvent {
  provider: IntegrationProvider;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey: string;
  payload: Record<string, IntegrationPayloadValue>;
}

export interface IntegrationSqlClient {
  query(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: Array<{ id: number }>; rowCount?: number | null }>;
}

/**
 * Creates a PII-free sandbox event for a persisted Media Kit request.
 * This does not authorize or perform a HubSpot write.
 */
export function createRequestCreatedSandboxEvent(input: {
  requestId: string;
  requestScope: 'tenant' | 'global';
}): IntegrationOutboxEvent {
  const requestId = input.requestId.trim();
  if (!requestId || requestId.length > 128) {
    throw new Error('requestId inválido para el evento de integración.');
  }
  if (input.requestScope !== 'tenant' && input.requestScope !== 'global') {
    throw new Error('requestScope inválido para el evento de integración.');
  }

  return {
    provider: 'sandbox',
    eventType: 'mediakit_request.created',
    aggregateType: 'mediakit_request',
    aggregateId: requestId,
    idempotencyKey: `sandbox:mediakit_request.created:${requestId}`,
    payload: { requestId, requestScope: input.requestScope },
  };
}

/**
 * Persists an event in the caller's existing transaction.
 * A duplicate provider/idempotency key is a no-op, never a second event.
 */
export async function enqueueIntegrationEvent(
  client: IntegrationSqlClient,
  event: IntegrationOutboxEvent,
): Promise<{ inserted: boolean; id: number | null }> {
  const result = await client.query(
    `INSERT INTO public.integration_outbox
       (provider, event_type, aggregate_type, aggregate_id, idempotency_key, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (provider, idempotency_key) DO NOTHING
     RETURNING id`,
    [
      event.provider,
      event.eventType,
      event.aggregateType,
      event.aggregateId,
      event.idempotencyKey,
      JSON.stringify(event.payload),
    ],
  );

  return {
    inserted: result.rows.length > 0,
    id: result.rows[0]?.id ?? null,
  };
}
