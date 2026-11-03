export type ProposalDurationUnit = 'días' | 'meses';
export type ProposalDuration = {
  duracionValor: string;
  duracionUnidad: ProposalDurationUnit;
};

const ALLOWED: Array<{ value: string; unit: ProposalDurationUnit }> = [
  { value: '7', unit: 'días' },
  { value: '15', unit: 'días' },
  { value: '21', unit: 'días' },
  { value: '1', unit: 'meses' },
];

export function normalizeProposalDuration(value: unknown, unit: unknown): ProposalDuration {
  const normalized = ALLOWED.find((option) => option.value === String(value ?? '') && option.unit === unit);
  return normalized ? { duracionValor: normalized.value, duracionUnidad: normalized.unit } : { duracionValor: '', duracionUnidad: 'días' };
}

export function isProposalDurationValid(period: ProposalDuration): boolean {
  return ALLOWED.some((option) => option.value === period.duracionValor && option.unit === period.duracionUnidad);
}

export function proposalDurationOption(period: ProposalDuration): string {
  return isProposalDurationValid(period) ? `${period.duracionValor}:${period.duracionUnidad}` : '';
}

export function proposalDurationFromOption(value: string): ProposalDuration {
  const [duracionValor, duracionUnidad] = value.split(':');
  return normalizeProposalDuration(duracionValor, duracionUnidad);
}

export function formatProposalDuration(period: ProposalDuration): string {
  if (!isProposalDurationValid(period)) return '';
  return period.duracionUnidad === 'meses' ? 'Mensual' : `${period.duracionValor} días`;
}


export type MediaKitLifecycleStatus = 'draft' | 'ready' | 'sent' | 'archived';

export function toLegacyMediaKitState(status: MediaKitLifecycleStatus): string {
  switch (status) {
    case 'ready': return 'Aceptado';
    case 'sent': return 'Enviado';
    case 'archived': return 'Archivado';
    default: return 'Borrador';
  }
}
