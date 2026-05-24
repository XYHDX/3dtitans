-- Phase 7 — Security hardening
-- ============================
--
-- Run in Supabase SQL Editor. Idempotent (uses DO blocks for CHECK constraints).
--
-- Adds DB-level defenses that complement the app-level checks:
--   1. Order.idempotencyKey length CHECK — defense in depth even if app validation skipped

-- ----------------------------------------------------------------------
-- Order.idempotencyKey length CHECK
-- ----------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_idempotency_key_length'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT order_idempotency_key_length
      CHECK ("idempotencyKey" IS NULL OR (length("idempotencyKey") BETWEEN 8 AND 128));
  END IF;
END $$;

-- ----------------------------------------------------------------------
-- Verify:
--   SELECT conname FROM pg_constraint WHERE conrelid = '"Order"'::regclass;
-- ----------------------------------------------------------------------
