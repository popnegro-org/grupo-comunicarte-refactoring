import crypto from 'crypto';
import { supports, supportPricing, supportMedia } from '../db/schema.ts';
import { getAllMediakitRequestsFromDB } from './mediakitService.ts';
import {
  createSupportMediaRecord,
  deleteSupportMediaRecord,
  deleteSupportRecord,
  getSupportPricingRecord,
  getSupportRouteRecord,
  listSupportMediaRecords,
  patchSupportRecord,
  resolveFamily,
  updateSupportPricingRecord,
  updateSupportRouteRecord,
  updateSupportMediaRecord,
  upsertSupportRecord,
  validateSupportPayload,
  generateCanonicalId,
  ensureUniqueCanonicalId,
  SupportWritePayload,
  validateFamily,
  validateAvailability,
} from './supportModel.ts';
import { getAllSupportsFromDB, getSupportByIdFromDB } from './supportsService.ts';
import { isSafeSupportMediaKey } from './r2StorageAdapter.ts';
import { areRequestItemOwnershipsConsistent, isSupportEligibleForPublicCatalog } from './tenantAccess.ts';
import { db, pool, isDatabaseConfigured } from '../db/index.ts';
import { and, count, eq, isNotNull } from 'drizzle-orm';

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET;
const MAX_FEATURED_SUPPORTS = 9;

if (!ADMIN_USER || !ADMIN_PASSWORD || !ADMIN_SECRET) {
  throw new Error(
    'FATAL: ADMIN_USER, ADMIN_PASSWORD and JWT_SECRET (or legacy ADMIN_SECRET) environment variables are required.'
  );
}

const adminUser = ADMIN_USER;
const adminPassword = ADMIN_PASSWORD;
const adminSecret = ADMIN_SECRET;

function canonicalizeEditorMedia<T extends SupportWritePayload>(data: T): T {
  if (data.media !== undefined || !Array.isArray(data.imageUrls)) return data;

  const urls = data.imageUrls.map((url) => String(url).trim()).filter(Boolean).slice(0, 3);
  if (urls.length === 0) return { ...data, media: [] };

  const coverType = (data.technical as any)?.metadata?.cover_media_type === 'video' ? 'video' : 'image';
  return {
    ...data,
    media: urls.map((url, index) => ({
      media_type: index === 0 ? coverType : 'image',
      url,
      sort_order: index,
      active: true,
      metadata: {
        source: 'support-editor',
        role: index === 0 ? 'cover' : 'gallery',
      },
    })),
  };
}

function secureStringEquals(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  if (leftBytes.length !== rightBytes.length) return false;
  return crypto.timingSafeEqual(leftBytes, rightBytes);
}

export function authenticateAdmin(username: string, password: string): { success: boolean; token?: string; message?: string } {
  const user = String(username ?? '').trim();
  const pass = String(password ?? '');
  if (user === adminUser && secureStringEquals(pass, adminPassword)) {
    const expiresAt = Date.now() + 8 * 3600 * 1000;
    const payload = `${user}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', adminSecret).update(payload).digest('hex');
    const token = Buffer.from(`${payload}:${signature}`).toString('base64');
    return { success: true, token };
  }
  return { success: false, message: 'Credenciales inválidas. Verifica usuario y contraseña.' };
}

export function verifyAdminToken(authHeader?: string): boolean {
  if (!authHeader) return false;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return false;
  try {
    const decoded = Buffer.from(parts[1], 'base64').toString('utf8');
    const [username, expiresAtStr, signature] = decoded.split(':');
    if (!username || !expiresAtStr || !signature) return false;
    if (username !== adminUser) return false;
    const expiresAt = Number(expiresAtStr);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

    const payload = `${username}:${expiresAt}`;
    const expectedSignature = crypto.createHmac('sha256', adminSecret).update(payload).digest('hex');
    if (signature.length !== expectedSignature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

export async function getAdminStats() {
  const allSupports = await getAllSupportsFromDB({ includeInactive: true, includeUnassigned: true });
  const allRequests = await getAllMediakitRequestsFromDB();

  const total = allSupports.filter((s: any) => s.active !== false).length;
  const available = allSupports.filter((s: any) => s.active !== false && s.disponibilidad === 'disponible').length;
  const reserved = allSupports.filter((s: any) => s.active !== false && s.disponibilidad === 'reservado').length;
  const inactive = allSupports.filter((s: any) => s.active === false).length;

  const mendozaSupports = allSupports.filter((s: any) => s.active !== false && (s.ciudad || '').toLowerCase() === 'mendoza');
  const mendozaTotal = mendozaSupports.filter((s: any) => s.disponibilidad === 'disponible').length;

  const buenosAiresSupports = allSupports.filter((s: any) => s.active !== false && (s.ciudad || '').toLowerCase() === 'buenos-aires');
  const buenosAiresTotal = buenosAiresSupports.length;
  const buenosAiresAvailable = buenosAiresSupports.filter((s: any) => s.disponibilidad === 'disponible').length;

  const tradicionalCount = allSupports.filter((s: any) => s.active !== false && (s.family === 'traditional' || s.tipo_soporte === 'tradicional')).length;
  const ledCount = allSupports.filter((s: any) => s.active !== false && (s.family === 'led' || s.tipo_soporte === 'led')).length;
  const movilCount = allSupports.filter((s: any) => s.active !== false && (s.family === 'led_mobile' || s.tipo_soporte === 'led_movil')).length;

  const plazaCount = new Set(allSupports.filter((s: any) => s.active !== false).map((s: any) => String(s.ciudad || '').trim().toLowerCase()).filter(Boolean)).size;

  const totalRequests = allRequests.length;
  const pendingRequests = allRequests.filter((r: any) => r.status === 'pending' || r.status === 'nuevo').length;

  return {
    total,
    available,
    reserved,
    inactive,
    mendozaTotal: mendozaSupports.length,
    mendozaAvailable: mendozaTotal,
    buenosAiresTotal,
    buenosAiresAvailable,
    tradicionalCount,
    ledCount,
    movilCount,
    totalRequests,
    plazaCount,
    pendingRequests,
  };
}

export async function listAdminSupports() {
  return getAllSupportsFromDB({ includeInactive: true, includeUnassigned: true });
}

export async function getAdminSupportById(canonicalId: string) {
  const support = await getSupportByIdFromDB(canonicalId, { includeInactive: true, includeUnassigned: true });
  if (!support) {
    throw new Error(`Soporte con ID '${canonicalId}' no encontrado.`);
  }
  return support;
}

async function assertFeaturedCapacity(canonicalId: string | null, data: SupportWritePayload) {
  const current = canonicalId
    ? await getSupportByIdFromDB(canonicalId, { includeInactive: true, includeUnassigned: true })
    : null;

  const nextFeatured = data.isFeatured === undefined ? current?.isFeatured === true : data.isFeatured === true;
  const nextActive = data.active === undefined ? current?.active !== false : data.active !== false;

  if (!nextFeatured || !nextActive) return;

  const currentlyFeatured = current?.isFeatured === true && current.active !== false;
  if (currentlyFeatured) return;

  const [result] = await db
    .select({ total: count() })
    .from(supports)
    .where(and(eq(supports.active, true), eq(supports.isFeatured, true)));

  if (Number(result?.total ?? 0) >= MAX_FEATURED_SUPPORTS) {
    throw new Error(`inválido: máximo ${MAX_FEATURED_SUPPORTS} soportes destacados activos permitidos.`);
  }
}

export async function createAdminSupport(data: SupportWritePayload & { canonical_id?: string }) {
  const canonicalData = canonicalizeEditorMedia(data);
  const family = resolveFamily(canonicalData, canonicalData.tipo_soporte);
  validateFamily(family);
  if (canonicalData.disponibilidad !== undefined) validateAvailability(canonicalData.disponibilidad);
  validateSupportPayload({ ...canonicalData, family });
  await assertFeaturedCapacity(null, canonicalData);

  if (canonicalData.canonical_id?.trim()) {
    const canonicalId = canonicalData.canonical_id.trim();
    const existing = await getSupportByIdFromDB(canonicalId, { includeInactive: true, includeUnassigned: true });
    if (existing) {
      throw new Error(`canonical_id duplicado: ${canonicalId}`);
    }
    return upsertSupportRecord(canonicalId, { ...canonicalData, family });
  }

  const baseCandidate = generateCanonicalId(canonicalData.name || '', canonicalData.ciudad || 'mendoza', family);
  const canonicalId = await ensureUniqueCanonicalId(baseCandidate);
  return upsertSupportRecord(canonicalId, { ...canonicalData, family });
}

export async function updateSupportByAdmin(canonicalId: string, data: SupportWritePayload) {
  const canonicalData = canonicalizeEditorMedia(data);
  await assertFeaturedCapacity(canonicalId, canonicalData);
  return patchSupportRecord(canonicalId, canonicalData);
}

export async function deactivateSupportByAdmin(canonicalId: string) {
  return deleteSupportRecord(canonicalId);
}

export async function updateSupportMediaByAdmin(canonicalId: string, mediaId: number, data: any) {
  return updateSupportMediaRecord(canonicalId, mediaId, data);
}

export async function addSupportMediaByAdmin(canonicalId: string, data: any) {
  return createSupportMediaRecord(canonicalId, data);
}

export async function removeSupportMediaByAdmin(canonicalId: string, mediaId: number) {
  return deleteSupportMediaRecord(canonicalId, mediaId);
}

export async function getSupportMediaByAdmin(canonicalId: string) {
  return listSupportMediaRecords(canonicalId);
}

export async function getPublicSupportMediaAsset(mediaId: number) {
  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) return null;
  const [result] = await db.select({ media: supportMedia, support: supports })
    .from(supportMedia)
    .innerJoin(supports, eq(supportMedia.supportCanonicalId, supports.canonicalId))
    .where(and(eq(supportMedia.id, mediaId), eq(supportMedia.active, true), eq(supports.active, true), isNotNull(supports.tenantId)))
    .limit(1);
  if (!result || !isSupportEligibleForPublicCatalog(result.support.tenantId, result.support.active)) return null;
  const storageKey = (result.media.metadata as Record<string, unknown> | null)?.storage_key;
  if (typeof storageKey !== 'string' || !isSafeSupportMediaKey(result.support.canonicalId, storageKey)) return null;
  return { storageKey, mimeType: result.media.mimeType || undefined };
}

export async function getSupportPricingByAdmin(canonicalId: string) {
  return getSupportPricingRecord(canonicalId);
}

export async function listSupportPricingByAdmin(): Promise<Record<string, {
  exhibition_price: string | null;
  installation_price: string | null;
  printing_price: string | null;
  monthly_price: string | null;
  exclusive_price: string | null;
  currency: string;
  tax_included: boolean;
}>> {
  const rows = await db.select().from(supportPricing);
  return Object.fromEntries(rows.map((row) => [row.supportCanonicalId, {
    exhibition_price: row.exhibitionPrice,
    installation_price: row.installationPrice,
    printing_price: row.printingPrice,
    monthly_price: row.monthlyPrice,
    exclusive_price: row.exclusivePrice,
    currency: row.currency,
    tax_included: row.taxIncluded,
  }]));
}

export async function patchSupportPricingByAdmin(canonicalId: string, pricing: any) {
  return updateSupportPricingRecord(canonicalId, pricing);
}

export async function getSupportRouteByAdmin(canonicalId: string) {
  return getSupportRouteRecord(canonicalId);
}

export async function patchSupportRouteByAdmin(canonicalId: string, route: any) {
  return updateSupportRouteRecord(canonicalId, route);
}

export async function updateRequestStatusByAdmin(requestId: string, status: string) {
  const validStatuses = ['pending', 'nuevo', 'contacted', 'contactado', 'quoted', 'enviado', 'closed', 'cerrado', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Estado comercial inválido: ${status}`);
  }
  if (!isDatabaseConfigured) throw new Error('La persistencia de solicitudes no está disponible.');

  const requiresOwnership = ['quoted', 'enviado', 'closed', 'cerrado'].includes(status);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await client.query(
      'SELECT request_id FROM mediakit_requests WHERE request_id = $1 FOR UPDATE',
      [requestId],
    );
    if (request.rows.length === 0) {
      throw new Error(`Solicitud con ID '${requestId}' no encontrada.`);
    }

    if (requiresOwnership) {
      const items = await client.query(
        `SELECT support_id, tenant_id
           FROM mediakit_request_items
          WHERE request_id = $1
          FOR UPDATE`,
        [requestId],
      );
      if (items.rows.length === 0) {
        throw new Error('La solicitud no puede avanzar comercialmente: no contiene ítems verificables.');
      }

      const supportIds = [...new Set(items.rows.map((item) => String(item.support_id || '').trim()).filter(Boolean))];
      const supportsResult = supportIds.length > 0
        ? await client.query(
            `SELECT canonical_id, tenant_id
               FROM supports
              WHERE canonical_id = ANY($1::text[])
              ORDER BY canonical_id
              FOR UPDATE`,
            [supportIds],
          )
        : { rows: [] as Array<{ canonical_id: string; tenant_id: string | null }> };
      const supportTenantById = new Map(
        supportsResult.rows.map((support) => [String(support.canonical_id), support.tenant_id as string | null]),
      );
      const ownershipPairs = items.rows.map((item) => ({
        itemTenantId: item.tenant_id as string | null,
        supportTenantId: supportTenantById.get(String(item.support_id || '').trim()) ?? null,
      }));

      if (
        supportsResult.rows.length !== supportIds.length ||
        !areRequestItemOwnershipsConsistent(ownershipPairs)
      ) {
        throw new Error('La solicitud no puede avanzar comercialmente: el ownership de sus ítems está pendiente o no coincide con el inventario actual.');
      }
    }

    const updated = await client.query(
      `UPDATE mediakit_requests
          SET status = $2, updated_at = CURRENT_TIMESTAMP
        WHERE request_id = $1
        RETURNING *`,
      [requestId, status],
    );
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
