import type { IntegrationOutboxEvent } from '../../server/integrationOutbox.ts';

export interface SandboxDeliveryResult {
  status: 'simulated';
  externalId: string;
  duplicate: boolean;
}

/**
 * In-memory adapter for contract tests and isolated demonstrations.
 * It performs no HTTP requests and stores no customer data outside memory.
 */
export class SandboxIntegrationAdapter {
  private readonly deliveries = new Map<string, string>();

  async deliver(event: IntegrationOutboxEvent): Promise<SandboxDeliveryResult> {
    const existing = this.deliveries.get(event.idempotencyKey);
    if (existing) {
      return { status: 'simulated', externalId: existing, duplicate: true };
    }

    const externalId = `sandbox:${event.provider}:${event.idempotencyKey}`;
    this.deliveries.set(event.idempotencyKey, externalId);
    return { status: 'simulated', externalId, duplicate: false };
  }

  get deliveryCount(): number {
    return this.deliveries.size;
  }
}
