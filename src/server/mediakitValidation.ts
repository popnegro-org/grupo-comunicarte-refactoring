export interface MediaKitFinancialInput {
  supportIds: string[];
  approvedPrices?: unknown;
  totalAmount?: number | string | null;
  currency?: string | null;
  status?: string;
}

export interface MediaKitFinancialResult {
  approvedPrices: Record<string, string>;
  totalAmount: number | null;
  currency: 'ARS' | 'USD' | 'POR DEFINIR';
}

export function validateMediaKitFinancials(input: MediaKitFinancialInput): MediaKitFinancialResult {
  const rawApprovedPrices = input.approvedPrices ?? {};
  if (!rawApprovedPrices || typeof rawApprovedPrices !== 'object' || Array.isArray(rawApprovedPrices)) {
    throw new Error('Los precios aprobados deben tener un formato válido.');
  }

  const approvedPrices: Record<string, string> = {};
  for (const [supportId, rawPrice] of Object.entries(rawApprovedPrices)) {
    if (typeof rawPrice === 'string' && rawPrice.trim() === '') continue;
    if (typeof rawPrice !== 'string' && typeof rawPrice !== 'number') {
      throw new Error(`El precio aprobado para '${supportId}' debe ser un número válido mayor o igual a cero.`);
    }
    if (!input.supportIds.includes(supportId)) {
      throw new Error(`El precio aprobado referencia un soporte no seleccionado: '${supportId}'.`);
    }
    if (rawPrice === null || rawPrice === undefined) {
      throw new Error(`El precio aprobado para '${supportId}' debe ser un número válido mayor o igual a cero.`);
    }
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`El precio aprobado para '${supportId}' debe ser un número válido mayor o igual a cero.`);
    }
    approvedPrices[supportId] = String(price);
  }

  if (input.currency != null && typeof input.currency !== 'string') {
    throw new Error('La moneda del Media Kit no está permitida.');
  }
  const currency = String(input.currency || 'ARS').trim().toUpperCase();
  if (!['ARS', 'USD', 'POR DEFINIR'].includes(currency)) {
    throw new Error('La moneda del Media Kit no está permitida.');
  }

  if (input.status === 'ready' && input.supportIds.length === 0) {
    throw new Error('Un Media Kit listo debe incluir al menos un soporte conciliado.');
  }

  if (input.totalAmount != null && typeof input.totalAmount !== 'number' && typeof input.totalAmount !== 'string') {
    throw new Error('El monto comercial global debe ser un número válido mayor o igual a cero.');
  }
  const totalAmount = input.totalAmount == null || (typeof input.totalAmount === 'string' && input.totalAmount.trim() === '')
    ? null
    : Number(input.totalAmount);
  if (totalAmount !== null && (!Number.isFinite(totalAmount) || totalAmount < 0)) {
    throw new Error('El monto comercial global debe ser un número válido mayor o igual a cero.');
  }
  if (currency === 'POR DEFINIR' && totalAmount !== null) {
    throw new Error('No se puede asignar un monto global cuando la moneda está definida como Por definir.');
  }

  return {
    approvedPrices,
    totalAmount,
    currency: currency as MediaKitFinancialResult['currency'],
  };
}
