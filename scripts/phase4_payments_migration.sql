-- Phase 4 — Payment methods on Order
-- ===================================
--
-- Run this in Supabase SQL editor BEFORE pushing the payment code,
-- otherwise the checkout API will 500 with "column does not exist".
-- Safe to re-run.

-- ----------------------------------------------------------------------
-- Add payment columns to Order
-- ----------------------------------------------------------------------

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod"    text;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus"    text NOT NULL DEFAULT 'pending';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentReference" text;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentProofUrl"  text;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paidAt"           timestamp;

CREATE INDEX IF NOT EXISTS order_payment_status_idx
  ON "Order" ("paymentStatus");

-- ----------------------------------------------------------------------
-- Seed default payment-method settings (admin can edit later via /admin/settings)
-- The values here are placeholders. Update with your actual bank / wallet info.
-- ----------------------------------------------------------------------

INSERT INTO "SiteSetting" (key, value, "updatedAt") VALUES
  ('payment.codEnabled',            'true', CURRENT_TIMESTAMP),
  ('payment.bankEnabled',           'true', CURRENT_TIMESTAMP),
  ('payment.shamCashEnabled',       'true', CURRENT_TIMESTAMP),
  ('payment.syriatelCashEnabled',   'true', CURRENT_TIMESTAMP),
  ('payment.stripeEnabled',         'false', CURRENT_TIMESTAMP),
  ('payment.bankName',              '',     CURRENT_TIMESTAMP),
  ('payment.bankAccountNumber',     '',     CURRENT_TIMESTAMP),
  ('payment.bankIban',              '',     CURRENT_TIMESTAMP),
  ('payment.bankAccountHolder',     '',     CURRENT_TIMESTAMP),
  ('payment.shamCashNumber',        '',     CURRENT_TIMESTAMP),
  ('payment.syriatelCashNumber',    '',     CURRENT_TIMESTAMP),
  ('payment.currencyLabel',         'SYP',  CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------
-- Verify with:
--   SELECT column_name FROM information_schema.columns WHERE table_name='Order' AND column_name LIKE 'payment%';
--   SELECT key, value FROM "SiteSetting" WHERE key LIKE 'payment.%';
-- ----------------------------------------------------------------------
