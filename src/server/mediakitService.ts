import { db, pool } from '../db/index.ts';
import { mediakitRequests, mediakitRequestItems } from '../db/schema.ts';
import { validateSupportsForRequest, getSupportByIdFromDB } from './supportsService.ts';
import { eq, desc } from 'drizzle-orm';
import { areLockedSupportsCommerciallyEligible, deriveRequestScope } from './tenantAccess.ts';
import { normalizeIdempotencyKey, requestIdFromIdempotencyKey } from './requestIdempotency.ts';
import { createRequestCreatedSandboxEvent, enqueueIntegrationEvent } from './integrationOutbox.ts';

export interface LeadPayload {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
}

export interface MediakitRequestBody {
  lead: LeadPayload;
  selectedIds: string[];
  idempotencyKey?: string;
}

export interface MediakitRecord {
  id: string;
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  requesterCompany: string;
  requesterPhone: string;
  message: string;
  status: string;
  requestScope: string | null;
  pendingOwnershipCount: number;
  tenantIds: string[];
  supportIds: string[];
  supportNames: string[];
  lead: {
    name: string;
    email: string;
    company: string;
    phone: string;
    message: string;
  };
  selectedIds: string[];
  selectedSupports: {
    canonical_id: string;
    name: string;
    ciudad: string;
    tipo_soporte: string;
  }[];
  createdAt: string;
}

/**
 * Handles Media Kit request submission with DB transaction and validation.
 */
export async function handleMediakitRequest(body: any): Promise<{
  statusCode: number;
  response: {
    status: 'success' | 'error';
    requestId?: string;
    duplicate?: boolean;
    message: string;
    data?: any;
  };
}> {
  try {
    if (!body || typeof body !== 'object') {
      return { statusCode: 400, response: { status: 'error', message: 'Cuerpo de solicitud inválido o vacío.' } };
    }

    const { lead, selectedIds } = body as MediakitRequestBody;
    const uniqueSelectedIds = Array.from(new Set((selectedIds || []).filter((id): id is string => typeof id === 'string' && id.trim().length > 0)));

    if (!lead || typeof lead !== 'object') {
      return { statusCode: 400, response: { status: 'error', message: 'Los datos de contacto (lead) son obligatorios.' } };
    }

    const name = typeof lead.name === 'string' ? lead.name.trim() : '';
    if (!name || name.length < 2) return { statusCode: 400, response: { status: 'error', message: 'El nombre es obligatorio y debe tener al menos 2 caracteres.' } };

    const email = typeof lead.email === 'string' ? lead.email.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, response: { status: 'error', message: 'El formato de correo electrónico ingresado no es válido.' } };
    }

    const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey);
    if (body.idempotencyKey !== undefined && !idempotencyKey) {
      return { statusCode: 400, response: { status: 'error', message: 'La clave de idempotencia no tiene un formato válido.' } };
    }
    const year = new Date().getFullYear();
    let requestId = idempotencyKey
      ? requestIdFromIdempotencyKey(idempotencyKey, year)
      : '';

    // A retry with the same key returns the original request before revalidating availability.
    if (requestId) {
      const existing = await db.select({ requestId: mediakitRequests.requestId, status: mediakitRequests.status })
        .from(mediakitRequests)
        .where(eq(mediakitRequests.requestId, requestId));
      if (existing.length > 0) {
        return {
          statusCode: 200,
          response: { status: 'success', requestId, duplicate: true, message: 'La solicitud ya había sido registrada.', data: { requestId, status: existing[0].status } },
        };
      }
    }

    const validation = await validateSupportsForRequest(uniqueSelectedIds);
    if (!validation.valid) {
      return { statusCode: validation.statusCode || 400, response: { status: 'error', message: validation.message || 'Error de validación de soportes.' } };
    }

    if (!requestId) {
      for (let attempts = 0; attempts < 8 && !requestId; attempts += 1) {
        const candidate = `REQ-${year}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
        const found = await db.select({ requestId: mediakitRequests.requestId }).from(mediakitRequests).where(eq(mediakitRequests.requestId, candidate));
        if (found.length === 0) requestId = candidate;
      }
    }
    if (!requestId) throw new Error('No se pudo generar un identificador único para la solicitud.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orderedIds = [...uniqueSelectedIds].sort();
      const lockedSupports = await client.query(
        `SELECT canonical_id, tenant_id, active, disponibilidad
           FROM supports
          WHERE canonical_id = ANY($1::text[])
          ORDER BY canonical_id
          FOR UPDATE`,
        [orderedIds],
      );
      if (!areLockedSupportsCommerciallyEligible(lockedSupports.rows, orderedIds.length)) {
        throw new Error('La selección contiene soportes pendientes de ownership, inexistentes o que ya no están disponibles.');
      }
      const tenantIds = [...new Set(lockedSupports.rows.map((support) => String(support.tenant_id)))];
      const requestScope = deriveRequestScope(tenantIds, false);
      if (!requestScope) throw new Error('No se pudo determinar el alcance comercial de la solicitud.');
      const headerInsert = await client.query(
        `INSERT INTO mediakit_requests (request_id, request_scope, requester_name, requester_email, requester_company, requester_phone, message, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (request_id) DO NOTHING
         RETURNING request_id`,
        [requestId, requestScope, name, email, typeof lead.company === 'string' ? lead.company.trim() : '', typeof lead.phone === 'string' ? lead.phone.trim() : '', typeof lead.message === 'string' ? lead.message.trim() : '', 'pending'],
      );
      if (headerInsert.rows.length === 0) {
        const existing = await client.query('SELECT status FROM mediakit_requests WHERE request_id = $1', [requestId]);
        await client.query('COMMIT');
        return { statusCode: 200, response: { status: 'success', requestId, duplicate: true, message: 'La solicitud ya había sido registrada.', data: { requestId, status: existing.rows[0]?.status ?? 'pending' } } };
      }
      for (const support of lockedSupports.rows) {
        await client.query(
          'INSERT INTO mediakit_request_items (request_id, support_id, tenant_id) VALUES ($1, $2, $3)',
          [requestId, support.canonical_id, support.tenant_id],
        );
      }
      // Sandbox-only outbox enqueue shares the request transaction and contains no contact PII.
      if (process.env.INTEGRATION_OUTBOX_MODE === 'sandbox') {
        const event = createRequestCreatedSandboxEvent({
          requestId,
          requestScope: requestScope as 'tenant' | 'global',
        });
        await enqueueIntegrationEvent(client, event);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      statusCode: 201,
      response: {
        status: 'success',
        requestId,
        message: 'Solicitud de Media Kit registrada exitosamente.',
        data: { requestId, selectedCount: uniqueSelectedIds.length, createdAt: new Date().toISOString() },
      },
    };
  } catch (err) {
    console.error('Error procesando solicitud de Media Kit:', err);
    return { statusCode: 500, response: { status: 'error', message: 'Ocurrió un error interno al procesar tu solicitud. Intenta nuevamente.' } };
  }
}

export async function getAllMediakitRequestsFromDB(): Promise<MediakitRecord[]> {
  const reqRows = await db.select().from(mediakitRequests).orderBy(desc(mediakitRequests.createdAt));
  const results: MediakitRecord[] = [];

  for (const req of reqRows) {
    const itemRows = await db
      .select()
      .from(mediakitRequestItems)
      .where(eq(mediakitRequestItems.requestId, req.requestId));

    const selectedIds = itemRows.map((i) => i.supportId);
    const selectedSupports = [];

    for (const sId of selectedIds) {
      const sup = await getSupportByIdFromDB(sId, { includeInactive: true, includeUnassigned: true });
      if (sup) selectedSupports.push({
        canonical_id: sup.canonical_id,
        name: sup.name,
        ciudad: sup.ciudad,
        tipo_soporte: sup.tipo_soporte,
      });
    }

    const requesterCompany = req.requesterCompany || '';
    const requesterPhone = req.requesterPhone || '';
    const message = req.message || '';
    const status = req.status || 'pending';
    const supportNames = selectedSupports.map((support) => support.name);
    const createdAt = req.createdAt ? new Date(req.createdAt).toISOString() : new Date().toISOString();

    results.push({
      id: req.requestId,
      requestId: req.requestId,
      requesterName: req.requesterName,
      requesterEmail: req.requesterEmail,
      requesterCompany,
      requesterPhone,
      message,
      status,
      requestScope: req.requestScope ?? null,
      pendingOwnershipCount: itemRows.filter((item) => !item.tenantId).length,
      tenantIds: [...new Set(itemRows.map((item) => item.tenantId).filter((tenantId): tenantId is string => Boolean(tenantId)))],
      supportIds: selectedIds,
      supportNames,
      lead: { name: req.requesterName, email: req.requesterEmail, company: requesterCompany, phone: requesterPhone, message },
      selectedIds,
      selectedSupports,
      createdAt,
    });
  }

  return results;
}
