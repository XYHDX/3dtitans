-- Phase 6 — Order idempotency key
-- ===============================
--
-- Run in Supabase SQL Editor. Idempotent.
--
-- Prevents duplicate orders from:
--   * Double-clicking the Place Order button
--   * Network retries
--   * Browser back/forward then re-submit
--
-- Flow:
--   1. Checkout page fetches /api/orders/idempotency-key on mount → fresh UUID
--   2. POST /api/orders includes that key in the body
--   3. Server: if an Order with the key already exists for this user, return it
--      (no duplicate). Otherwise create a new one.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyKey" text;

CREATE UNIQUE INDEX IF NOT EXISTS order_idempotency_key_unique
  ON "Order" ("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

-- ----------------------------------------------------------------------
-- Verify:
--   SELECT column_name FROM information_schema.columns WHERE table_name='Order' AND column_name='idempotencyKey';
-- ----------------------------------------------------------------------
