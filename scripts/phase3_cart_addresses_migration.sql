-- Phase 3 — Cart persistence + Saved addresses
-- ============================================
--
-- Run this in Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to run multiple times — uses IF NOT EXISTS guards everywhere.
--
-- After applying:
--   * Logged-in users get DB-backed carts (survives logout / device switch)
--   * Guest carts continue to use localStorage; merge happens automatically on login
--   * /api/addresses lets users save shipping addresses for one-click checkout
--   * Checkout pre-fills from the user's default address

-- ----------------------------------------------------------------------
-- CART ITEM (composite PK: userId + productId)
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "CartItem" (
  "userId"    text      NOT NULL,
  "productId" text      NOT NULL,
  quantity    integer   NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  "addedAt"   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "productId"),
  CONSTRAINT cart_user_fkey FOREIGN KEY ("userId")
    REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT cart_product_fkey FOREIGN KEY ("productId")
    REFERENCES "Product"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS cart_user_added_idx
  ON "CartItem" ("userId", "addedAt" DESC);

-- ----------------------------------------------------------------------
-- ADDRESS (multiple per user, one optional default)
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Address" (
  id           text       PRIMARY KEY,
  label        text,
  name         text       NOT NULL,
  line1        text       NOT NULL,
  line2        text,
  city         text       NOT NULL,
  "postalCode" text       NOT NULL,
  country      text       NOT NULL,
  phone        text,
  "isDefault"  boolean    NOT NULL DEFAULT false,
  "createdAt"  timestamp  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  timestamp  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"     text       NOT NULL,
  CONSTRAINT address_user_fkey FOREIGN KEY ("userId")
    REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS address_user_default_idx
  ON "Address" ("userId", "isDefault" DESC);

-- ----------------------------------------------------------------------
-- TRIGGER — enforce "at most one default address per user".
-- When a row is marked isDefault=true, clear the flag on every other row
-- for the same user. Keeps the data clean even if a buggy client sends
-- multiple isDefault updates concurrently.
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_address_single_default()
RETURNS trigger AS $$
BEGIN
  IF NEW."isDefault" THEN
    UPDATE "Address"
       SET "isDefault" = false
     WHERE "userId" = NEW."userId"
       AND id != NEW.id
       AND "isDefault" = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS address_single_default_trigger ON "Address";
CREATE TRIGGER address_single_default_trigger
  AFTER INSERT OR UPDATE OF "isDefault" ON "Address"
  FOR EACH ROW
  WHEN (NEW."isDefault" = true)
  EXECUTE FUNCTION trg_address_single_default();

-- ----------------------------------------------------------------------
-- Verify with:
--   SELECT count(*) FROM "CartItem";   -- 0 initially
--   SELECT count(*) FROM "Address";    -- 0 initially
--   \dt+ "CartItem"
--   \dt+ "Address"
-- ----------------------------------------------------------------------
