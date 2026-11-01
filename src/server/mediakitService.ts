import { db, pool } from '../db/index.ts';
import { mediakitRequests, mediakitRequestItems } from '../db/schema.ts';
import { validateSupportsForRequest, getSupportByIdFromDB } from './supportsService.ts';
import { eq, desc } from 'drizzle-orm';
import { deriveRequestScope } from './tenantAccess.ts';

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

    const validation = await validateSupportsForRequest(uniqueSelectedIds);
    if (!validation.valid) {
      return { statusCode: validation.statusCode || 400, response: { status: 'error', message: validation.message || 'Error de validación de soportes.' } };
    }

    const year = new Date().getFullYear();
    let requestId = '';
    for (let attempts = 0; attempts < 8 && !requestId; attempts += 1) {
      const candidate = `REQ-${year}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const found = await db.select({ requestId: mediakitRequests.requestId }).from(mediakitRequests).where(eq(mediakitRequests.requestId, candidate));
      if (found.length === 0) requestId = candidate;
    }
    if (!requestId) throw new Error('No se pudo generar un identificador único para la solicitud.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const lockedSupports = await client.query(
        `SELECT canonical_id, tenant_id, active, disponibilidad
           FROM supports
          WHERE canonical_id = ANY($1::text[])
          FOR UPDATE`,
        [uniqueSelectedIds],
      );
      if (lockedSupports.rows.length !== uniqueSelectedIds.length) {
        throw new Error('La selección cambió mientras se procesaba. Actualizá el catálogo e intentá nuevamente.');
      }
      if (lockedSupports.rows.some((support) => !support.tenant_id || support.active !== true || support.disponibilidad !== 'disponible')) {
        throw new Error('La selección contiene soportes pendientes de ownership o que ya no están disponibles.');
      }
      const tenantIds = [...new Set(lockedSupports.rows.map((support) => String(support.tenant_id)))];
      const requestScope = deriveRequestScope(tenantIds, false);
      if (!requestScope) throw new Error('No se pudo determinar el alcance comercial de la solicitud.');
      await client.query(
        `INSERT INTO mediakit_requests (request_id, request_scope, requester_name, requester_email, requester_company, requester_phone, message, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [requestId, requestScope, name, email, typeof lead.company === 'string' ? lead.company.trim() : '', typeof lead.phone === 'string' ? lead.phone.trim() : '', typeof lead.message === 'string' ? lead.message.trim() : '', 'pending'],
      );
      for (const support of lockedSupports.rows) {
        await client.query(
          'INSERT INTO mediakit_request_items (request_id, support_id, tenant_id) VALUES ($1, $2, $3)',
          [requestId, support.canonical_id, support.tenant_id],
        );
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
