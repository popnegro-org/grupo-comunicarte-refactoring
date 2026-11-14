import { MediaKitDomainError } from './mediakitErrors.ts';
import { areRequestItemOwnershipsConsistent } from './tenantAccess.ts';

export interface MediaKitSourceRequestItem {
  support_id?: string | null;
  item_tenant_id: string | null;
  support_tenant_id: string | null;
}

export function validateMediaKitSourceRequestItems(
  sourceItems: MediaKitSourceRequestItem[],
  selectedSupportIds: string[],
): void {
  if (sourceItems.length === 0) {
    throw new MediaKitDomainError('La solicitud de origen no existe.', 404);
  }

  const requestItems = sourceItems.filter((item) => item.support_id);
  const ownershipIsConsistent = requestItems.length > 0
    && areRequestItemOwnershipsConsistent(requestItems.map((item) => ({
      itemTenantId: item.item_tenant_id,
      supportTenantId: item.support_tenant_id,
    })));

  if (!ownershipIsConsistent) {
    throw new MediaKitDomainError('No se puede generar un Media Kit desde una solicitud con ownership pendiente o desactualizado.', 409);
  }

  const requestSupportIds = new Set(requestItems.map((item) => String(item.support_id)));
  const unrelatedSupport = selectedSupportIds.find((supportId) => !requestSupportIds.has(supportId));
  if (unrelatedSupport) {
    throw new MediaKitDomainError(`El soporte '${unrelatedSupport}' no pertenece a la solicitud de origen.`, 409);
  }
}
