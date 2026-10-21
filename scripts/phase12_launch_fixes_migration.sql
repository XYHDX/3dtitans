-- =============================================================================
-- Phase 12 — Columns needed by the launch fixes
-- =============================================================================
-- Run in the Supabase SQL editor BEFORE deploying the new code (the new code
-- reads these columns). Everything here is additive or relaxes a constraint,
-- so the currently-live site keeps working after it runs. Idempotent.
--
--   User.tokenVersion      — sessions are revoked by bumping it (role change,
--                            password reset, deletion).
--   Product.archivedAt     — products are archived instead of deleted, so
--                            customers' orders keep their history.
--   Order.currency         — currency fixed at order time (legacy rows: NULL).
--   Order.utm*             — campaign attribution for each order.
--   Order.shippingPostalCode / Address.postalCode become optional
--                            (Syrian addresses rarely have one).
-- =============================================================================

BEGIN;

ALTER TABLE "User"    ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "archivedAt"   TIMESTAMP(3);

ALTER TABLE "Order"   ADD COLUMN IF NOT EXISTS "currency"     TEXT;
ALTER TABLE "Order"   ADD COLUMN IF NOT EXISTS "utmSource"    TEXT;
ALTER TABLE "Order"   ADD COLUMN IF NOT EXISTS "utmMedium"    TEXT;
ALTER TABLE "Order"   ADD COLUMN IF NOT EXISTS "utmCampaign"  TEXT;

ALTER TABLE "Order"   ALTER COLUMN "shippingPostalCode" DROP NOT NULL;
ALTER TABLE "Address" ALTER COLUMN "postalCode"         DROP NOT NULL;

-- Hide archived products quickly in shop listings.
CREATE INDEX IF NOT EXISTS "Product_archivedAt_idx" ON "Product"("archivedAt");

COMMIT;

-- Verify
SELECT table_name, column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'User' AND column_name = 'tokenVersion')
    OR (table_name = 'Product' AND column_name = 'archivedAt')
    OR (table_name = 'Order' AND column_name IN ('currency', 'utmSource', 'utmMedium', 'utmCampaign', 'shippingPostalCode'))
    OR (table_name = 'Address' AND column_name = 'postalCode'))
ORDER BY table_name, column_name;
