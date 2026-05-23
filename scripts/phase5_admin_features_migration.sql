-- Phase 5 — Admin features: maintenance mode + manual store sort
-- ===============================================================
--
-- Run in Supabase SQL Editor. Idempotent.

-- ----------------------------------------------------------------------
-- 1. Store sortOrder (manual admin sort)
-- ----------------------------------------------------------------------

ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS store_sort_updated_idx ON "Store" ("sortOrder", "updatedAt" DESC);

-- ----------------------------------------------------------------------
-- 2. Site settings — maintenance mode + general flags
-- ----------------------------------------------------------------------

INSERT INTO "SiteSetting" (key, value, "updatedAt") VALUES
  ('site.maintenanceMode',    'false', CURRENT_TIMESTAMP),
  ('site.maintenanceMessage', 'We''re upgrading the marketplace. Be back shortly.', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------
-- Verify with:
--   SELECT "sortOrder" FROM "Store" LIMIT 1;
--   SELECT key, value FROM "SiteSetting" WHERE key LIKE 'site.%';
-- ----------------------------------------------------------------------
