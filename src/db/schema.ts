import { pgTable, serial, text, numeric, boolean, json, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan').notNull().default('basic'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const supports = pgTable('supports', {
  id: serial('id').primaryKey(),
  canonicalId: text('canonical_id').notNull().unique(),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  ciudad: text('ciudad').notNull(),
  tipoSoporte: text('tipo_soporte').notNull(),
  family: text('family').notNull().default('traditional'),
  active: boolean('active').notNull().default(true),
  lat: numeric('lat'),
  lng: numeric('lng'),
  address: text('address'),
  description: text('description'),
  characteristics: text('characteristics'),
  mapaUrl: text('mapa_url'),
  imageUrls: json('image_urls').$type<string[]>(),
  disponibilidad: text('disponibilidad').notNull().default('disponible'),
  availableFrom: text('available_from'),
  isFeatured: boolean('is_featured').default(false),
  schedule: text('schedule'),
  duration: text('duration'),
  waypoints: json('waypoints').$type<{ name: string; lat: number | null; lng: number | null }[]>(),
  routePath: json('route_path').$type<[number, number][]>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const supportLocations = pgTable('support_locations', {
  supportCanonicalId: text('support_canonical_id').primaryKey(),
  name: text('name').notNull(),
  ciudad: text('ciudad').notNull(),
  family: text('family').notNull(),
  category: text('category').notNull(),
  lat: numeric('lat'),
  lng: numeric('lng'),
  address: text('address'),
  mapaUrl: text('mapa_url'),
  availability: text('availability').notNull().default('disponible'),
  availableFrom: text('available_from'),
  active: boolean('active').notNull().default(true),
  isFeatured: boolean('is_featured').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const supportFaces = pgTable('support_faces', {
  id: serial('id').primaryKey(),
  supportCanonicalId: text('support_canonical_id').notNull(),
  faceKey: text('face_key').notNull(),
  label: text('label').notNull(),
  side: text('side'),
  widthMeters: numeric('width_meters'),
  heightMeters: numeric('height_meters'),
  widthPixels: integer('width_pixels'),
  heightPixels: integer('height_pixels'),
  substrate: text('substrate'),
  notes: text('notes'),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const supportTechnical = pgTable('support_technical', {
  supportCanonicalId: text('support_canonical_id').primaryKey(),
  summary: text('summary'),
  measures: text('measures'),
  monthlyImpacts: numeric('monthly_impacts'),
  resolution: text('resolution'),
  turnOnSchedule: text('turn_on_schedule'),
  dailyFrequency: text('daily_frequency'),
  requirements: text('requirements'),
  spotDurationSeconds: integer('spot_duration_seconds'),
  minimumDailyOutings: integer('minimum_daily_outings'),
  maxAdvertisers: integer('max_advertisers'),
  routeDurationHours: numeric('route_duration_hours'),
  operationDays: text('operation_days'),
  videoMode: text('video_mode'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const supportPricing = pgTable('support_pricing', {
  supportCanonicalId: text('support_canonical_id').primaryKey(),
  exhibitionPrice: numeric('exhibition_price'),
  installationPrice: numeric('installation_price'),
  printingPrice: numeric('printing_price'),
  monthlyPrice: numeric('monthly_price'),
  exclusivePrice: numeric('exclusive_price'),
  currency: text('currency').notNull().default('ARS'),
  taxIncluded: boolean('tax_included').notNull().default(false),
  pricePublic: boolean('price_public').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const supportMedia = pgTable('support_media', {
  id: serial('id').primaryKey(),
  supportCanonicalId: text('support_canonical_id').notNull(),
  mediaType: text('media_type').notNull(),
  url: text('url').notNull(),
  title: text('title'),
  alt: text('alt'),
  mimeType: text('mime_type'),
  sortOrder: integer('sort_order').notNull().default(0),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const supportRoutes = pgTable('support_routes', {
  supportCanonicalId: text('support_canonical_id').primaryKey(),
  routeName: text('route_name'),
  routeMode: text('route_mode'),
  routePath: jsonb('route_path').$type<[number, number][]>(),
  waypoints: jsonb('waypoints').$type<{ name: string; lat: number | null; lng: number | null }[]>(),
  defaultRoute: boolean('default_route').notNull().default(false),
  schedule: text('schedule'),
  duration: text('duration'),
  hours: text('hours'),
  weekdays: text('weekdays'),
  maxAdvertisers: integer('max_advertisers'),
  spotDurationSeconds: integer('spot_duration_seconds'),
  minimumDailyOutings: integer('minimum_daily_outings'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const mediakitRequests = pgTable('mediakit_requests', {
  id: serial('id').primaryKey(),
  requestScope: text('request_scope'),
  requestId: text('request_id').notNull().unique(),
  requesterName: text('requester_name').notNull(),
  requesterEmail: text('requester_email').notNull(),
  requesterCompany: text('requester_company'),
  requesterPhone: text('requester_phone'),
  message: text('message'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const mediakitRequestItems = pgTable('mediakit_request_items', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'restrict' }),
  requestId: text('request_id').notNull(),
  supportId: text('support_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Persistent Media Kit document generated from a request/builder session.
 * The table is intentionally separate from mediakit_requests so commercial
 * requests remain the lead/inbox record while a Media Kit can evolve through
 * its own lifecycle (draft -> ready -> sent -> archived).
 */
export const mediakits = pgTable('mediakits', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  kitId: text('kit_id').notNull().unique(),
  sourceRequestId: text('source_request_id'),
  status: text('status').notNull().default('draft'),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email'),
  clientCompany: text('client_company'),
  clientPhone: text('client_phone'),
  supportIds: jsonb('support_ids').$type<string[]>().notNull().default([]),
  approvedPrices: jsonb('approved_prices').$type<Record<string, string>>().notNull().default({}),
  totalAmount: numeric('total_amount'),
  currency: text('currency').notNull().default('ARS'),
  notes: text('notes'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  pdfUrl: text('pdf_url'),
  pptUrl: text('ppt_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const mediakitItems = pgTable('mediakit_items', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'restrict' }),
  kitId: text('kit_id').notNull(),
  supportId: text('support_id').notNull(),
  approvedPrice: numeric('approved_price'),
  sortOrder: integer('sort_order').notNull().default(0),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
