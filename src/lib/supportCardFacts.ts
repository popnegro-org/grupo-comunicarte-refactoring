import { isMobileRoute } from '../types';
import type { InventoryItem, MobileRoute } from '../types';

const MISSING_FACT_VALUE = 'A confirmar';

export interface SupportCardFact {
  label: string;
  value: string;
  priority: number;
}

function textOrPending(value?: string | null): string {
  return typeof value === 'string' && value.trim() ? value.trim() : MISSING_FACT_VALUE;
}

export function formatImpacts(value?: number | string | null): string | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  const numeric = Number(String(value).trim().replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(numeric)) return String(value);
  if (numeric >= 1_000_000) return `+${(numeric / 1_000_000).toFixed(1).replace('.', ',')} M`;
  if (numeric >= 1_000) return `+${Math.round(numeric / 1_000)} K`;
  return `+${Math.round(numeric).toLocaleString('es-AR')}`;
}

/**
 * Every support family exposes its three canonical facts.
 * Missing editorial data is explicit; it is never calculated or invented.
 */
export function getCardFacts(item: InventoryItem): SupportCardFact[] {
  const technical = item.technical;
  const impacts: SupportCardFact = {
    label: 'Impactos / mes',
    value: formatImpacts(technical?.monthly_impacts) ?? MISSING_FACT_VALUE,
    priority: 4,
  };

  if (item.family === 'led_mobile' || item.tipo_soporte === 'led_movil') {
    const route = isMobileRoute(item) ? item as MobileRoute : null;
    const spotSeconds = technical?.spot_duration_seconds;
    return [
      { label: 'Duración', value: textOrPending(route?.duration), priority: 1 },
      {
        label: 'Spot',
        value: spotSeconds !== null && spotSeconds !== undefined && Number(spotSeconds) > 0
          ? `${spotSeconds}s`
          : MISSING_FACT_VALUE,
        priority: 3,
      },
      impacts,
    ];
  }

  if (item.family === 'led' || item.tipo_soporte === 'led' || (item.tipo_soporte as string) === 'pantallas_led') {
    return [
      { label: 'Medidas', value: textOrPending(technical?.measures), priority: 1 },
      { label: 'Resolución', value: textOrPending(technical?.resolution), priority: 2 },
      impacts,
    ];
  }

  const faces = technical?.caras;
  return [
    { label: 'Medidas', value: textOrPending(technical?.measures), priority: 1 },
    {
      label: 'Caras',
      value: faces !== null && faces !== undefined && Number(faces) > 0 ? String(faces) : MISSING_FACT_VALUE,
      priority: 3,
    },
    impacts,
  ];
}
