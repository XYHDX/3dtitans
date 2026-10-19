-- Phase 8 — Payment transactions (Sham Cash auto-verification) + safety checks
-- ==========================================================================
--
-- Run in the Supabase SQL Editor BEFORE deploying the code that uses it.
-- Safe to re-run.

-- ----------------------------------------------------------------------
-- 1. PaymentTransaction — one row per external transfer used to pay an order.
--    UNIQUE (provider, externalId) means a single Sham Cash transfer can never
--    be counted for two different orders.
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
  "id"          text PRIMARY KEY,
  "provider"    text NOT NULL,
  "externalId"  text NOT NULL,
  "amount"      numeric(65,30) NOT NULL,
  "currency"    text NOT NULL,
  "senderName"  text,
  "note"        text,
  "occurredAt"  timestamp(3),
  "createdAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "orderId"     text NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_provider_externalId_key"
  ON "PaymentTransaction" ("provider", "externalId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_orderId_idx"
  ON "PaymentTransaction" ("orderId");

-- Order.notes is read by the orders API (older DBs may lack it).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- ----------------------------------------------------------------------
-- 2. Prices must be positive (defense in depth — the API validates too).
--    NOT VALID = existing rows are not re-checked, new/updated rows are.
-- ----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_price_positive') THEN
    ALTER TABLE "Product" ADD CONSTRAINT product_price_positive CHECK ("price" > 0) NOT VALID;
  END IF;
END $$;

-- ----------------------------------------------------------------------
-- 3. Payment proof screenshots must not be public. The app now serves them
--    to admins through short-lived signed links.
-- ----------------------------------------------------------------------
UPDATE storage.buckets SET public = false WHERE id = 'payment-proofs';

-- ----------------------------------------------------------------------
-- Verify:
--   SELECT * FROM "PaymentTransaction" LIMIT 1;
--   SELECT id, public FROM storage.buckets WHERE id = 'payment-proofs';
-- ----------------------------------------------------------------------
