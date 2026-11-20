export type SupportType = 'tradicional' | 'led' | 'led_movil';
export type MediaKind = 'image' | 'video';
export type Plaza = 'mendoza' | 'buenos-aires';
export type EditorTab = 'general' | 'location' | 'content' | 'commercial';
export type NumericFieldValue = number | '';

export type FormState = {
  tenant_id: string;
  tenant_ownership_evidence: string;
  publicName: string;
  ciudad: Plaza;
  tipo_soporte: SupportType;
  active: boolean;
  disponibilidad: 'disponible' | 'reservado';
  isFeatured: boolean;
  address: string;
  lat: string;
  lng: string;
  mapa_url: string;
  description: string;
  coverUrl: string;
  coverKind: MediaKind;
  restMedia: string[];
  traditional: {
    formato: string;
    medidas: string;
    caras: NumericFieldValue;
    impresion: string;
    monthly_impacts: NumericFieldValue;
  };
  led: {
    formato: string;
    medidas: string;
    resolucion: string;
    frecuencia: string;
    video_mode: string;
    spot_duration: NumericFieldValue;
    monthly_impacts: NumericFieldValue;
  };
  mobile: {
    pantalla: string;
    resolucion: string;
    spot_duration: NumericFieldValue;
    minimum_daily_outings: NumericFieldValue;
    recorrido: string;
    operation_days: string;
    duration: NumericFieldValue;
    monthly_impacts: NumericFieldValue;
  };
  pricing: {
    exhibition: NumericFieldValue;
    installation: NumericFieldValue;
    printing: NumericFieldValue;
    monthly: NumericFieldValue;
    exclusive: NumericFieldValue;
    currency: string;
  };
  reservedFrom: string;
  reservedUntil: string;
};

export const emptyForm: FormState = {
  tenant_id: '',
  tenant_ownership_evidence: '',
  publicName: '',
  ciudad: 'mendoza',
  tipo_soporte: 'tradicional',
  active: true,
  disponibilidad: 'disponible',
  isFeatured: false,
  address: '',
  lat: '',
  lng: '',
  mapa_url: '',
  description: '',
  coverUrl: '',
  coverKind: 'image',
  restMedia: [],
  traditional: { formato: '', medidas: '', caras: '', impresion: '', monthly_impacts: '' },
  led: { formato: '', medidas: '', resolucion: '', frecuencia: '', video_mode: '', spot_duration: '', monthly_impacts: '' },
  mobile: { pantalla: '', resolucion: '', spot_duration: '', minimum_daily_outings: '', recorrido: '', operation_days: '', duration: '', monthly_impacts: '' },
  pricing: { exhibition: '', installation: '', printing: '', monthly: '', exclusive: '', currency: 'ARS' },
  reservedFrom: '',
  reservedUntil: '',
};

export const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'location', label: 'Ubicación' },
  { id: 'content', label: 'Contenido' },
  { id: 'commercial', label: 'Comercial' },
];