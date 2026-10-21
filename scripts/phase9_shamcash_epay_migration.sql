-- Phase 9 — ShamCash Electronic Payment (e-pay): PaymentAttempt table
-- ===================================================================
--
-- WHEN: run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor →
--       New query → paste → Run) BEFORE deploying the code that adds the
--       "ShamCash — pay online" method. The new code reads/writes
--       "PaymentAttempt"; without this table e-pay checkout fails with a
--       database error (other payment methods keep working).
-- SAFE: idempotent — every statement uses IF NOT EXISTS or a DO-block guard,
--       so re-running it is harmless. It only ADDS objects; nothing is dropped
--       or rewritten.
-- WHO:  run it as the default "postgres" role (what the SQL Editor uses). The
--       app's Prisma connection uses the same owner role, so Row Level
--       Security (enabled below) does not affect the app — it only locks the
--       table away from the public Supabase API roles (anon / authenticated).
--
-- One row = one ShamCash bill created for an order. Retries get a new billNo
-- ("3DT-AB12CD34-1", "-2", …); "billNo" is UNIQUE so a webhook can never be
-- matched to two attempts.

-- ----------------------------------------------------------------------
-- 1. Table (quoted PascalCase table, camelCase columns — same as Prisma)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PaymentAttempt" (
  "id"            text          PRIMARY KEY,
  "orderId"       text          NOT NULL,
  "provider"      text          NOT NULL DEFAULT 'sham_cash_epay',
  "billNo"        text          NOT NULL,
  "amount"        numeric(18,2) NOT NULL,
  "currency"      text          NOT NULL,
  "status"        text          NOT NULL DEFAULT 'pending',
  "paymentUrl"    text,
  "tranId"        text,
  "createdAt"     timestamp(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     timestamp(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"     timestamp(3)  NOT NULL,
  "paidAt"        timestamp(3),
  "lastCheckedAt" timestamp(3)
);

-- ----------------------------------------------------------------------
-- 2. Indexes (names match what Prisma expects)
-- ----------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAttempt_billNo_key"
  ON "PaymentAttempt" ("billNo");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_orderId_idx"
  ON "PaymentAttempt" ("orderId");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_status_createdAt_idx"
  ON "PaymentAttempt" ("status", "createdAt");

-- At most ONE open (pending) bill per order: two quick "Pay" clicks can never
-- open two ShamCash bills for the same order (the create route relies on this).
-- Partial index: Prisma can't express it in schema.prisma (it is not reported
-- by `prisma migrate diff` either) — keep this script as its source of truth.
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAttempt_one_pending_per_order"
  ON "PaymentAttempt"("orderId") WHERE "status" = 'pending';

-- ----------------------------------------------------------------------
-- 3. Foreign key to "Order" — RESTRICT: an order that has payment attempts
--    can't be deleted by accident (the app cleans up expired/failed attempts
--    itself before deleting an unpaid order).
-- ----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentAttempt_orderId_fkey') THEN
    ALTER TABLE "PaymentAttempt"
      ADD CONSTRAINT "PaymentAttempt_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ----------------------------------------------------------------------
-- 4. Defense in depth (the API validates too)
-- ----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_attempt_amount_positive') THEN
    ALTER TABLE "PaymentAttempt"
      ADD CONSTRAINT payment_attempt_amount_positive CHECK ("amount" >= 0.01);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_attempt_status_valid') THEN
    ALTER TABLE "PaymentAttempt"
      ADD CONSTRAINT payment_attempt_status_valid
      CHECK ("status" IN ('pending', 'paid', 'expired', 'failed', 'refunded', 'partly_refunded'));
  END IF;
END $$;

-- ----------------------------------------------------------------------
-- 5. Keep it out of the public Supabase API (PostgREST)
-- ----------------------------------------------------------------------
ALTER TABLE "PaymentAttempt" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PaymentAttempt" FROM anon, authenticated;

-- ----------------------------------------------------------------------
-- Verify:
--   SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name = 'PaymentAttempt' ORDER BY ordinal_position;
--   SELECT indexname FROM pg_indexes WHERE tablename = 'PaymentAttempt';
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'PaymentAttempt';  -- t
-- ----------------------------------------------------------------------
