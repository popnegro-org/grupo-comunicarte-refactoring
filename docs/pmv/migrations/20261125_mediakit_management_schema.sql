-- Media Kit management schema
-- Apply explicitly to the intended Neon branch/database before deploying code
-- that uses Media Kit management. This migration is additive and idempotent.
-- It intentionally performs no data deletion and no DROP/RENAME operations.

BEGIN;

CREATE TABLE IF NOT EXISTS mediakits (
  id SERIAL PRIMARY KEY,
  kit_id TEXT UNIQUE NOT NULL,
  source_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_company TEXT,
  client_phone TEXT,
  support_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_prices JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'ARS',
  notes TEXT,
  metadata JSONB,
  pdf_url TEXT,
  ppt_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mediakit_items (
  id SERIAL PRIMARY KEY,
  kit_id TEXT NOT NULL,
  support_id TEXT NOT NULL,
  approved_price NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS id SERIAL;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS kit_id TEXT;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS source_request_id TEXT;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS client_company TEXT;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS support_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS approved_prices JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS total_amount NUMERIC;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ARS';
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS ppt_url TEXT;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS id SERIAL;
ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS kit_id TEXT;
ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS support_id TEXT;
ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS approved_price NUMERIC;
ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM mediakits
    WHERE kit_id IS NOT NULL
    GROUP BY kit_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Media Kit migration aborted: duplicate mediakits.kit_id values must be reconciled explicitly';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mediakits_kit_id ON mediakits(kit_id);
CREATE INDEX IF NOT EXISTS idx_mediakits_status ON mediakits(status);
CREATE INDEX IF NOT EXISTS idx_mediakits_source_request ON mediakits(source_request_id);
CREATE INDEX IF NOT EXISTS idx_mediakit_items_kit_id ON mediakit_items(kit_id);

COMMIT;
