-- Phase 2 — Reviews + Wishlist tables
-- ====================================
--
-- Run this in Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to run multiple times — uses IF NOT EXISTS guards everywhere.
--
-- After applying:
--   1. Prisma client auto-regenerates on next Vercel build (postinstall hook).
--   2. The API routes /api/products/[id]/reviews and /api/wishlist start working.
--   3. Existing Product.rating + reviewCount stay correct because the
--      recalc_product_rating trigger keeps them in sync.

-- ----------------------------------------------------------------------
-- REVIEW TABLE
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Review" (
  id                text        PRIMARY KEY,
  rating            integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title             text,
  body              text,
  "verifiedPurchase" boolean    NOT NULL DEFAULT false,
  "createdAt"       timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "productId"       text        NOT NULL,
  "userId"          text        NOT NULL,
  CONSTRAINT review_product_fkey FOREIGN KEY ("productId")
    REFERENCES "Product"(id) ON DELETE CASCADE,
  CONSTRAINT review_user_fkey FOREIGN KEY ("userId")
    REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT review_unique_user_per_product UNIQUE ("productId", "userId")
);

CREATE INDEX IF NOT EXISTS review_product_created_idx
  ON "Review" ("productId", "createdAt" DESC);

-- ----------------------------------------------------------------------
-- WISHLIST TABLE
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "WishlistItem" (
  "userId"    text        NOT NULL,
  "productId" text        NOT NULL,
  "addedAt"   timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "productId"),
  CONSTRAINT wishlist_user_fkey FOREIGN KEY ("userId")
    REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT wishlist_product_fkey FOREIGN KEY ("productId")
    REFERENCES "Product"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS wishlist_user_added_idx
  ON "WishlistItem" ("userId", "addedAt" DESC);

-- ----------------------------------------------------------------------
-- TRIGGER — keep Product.rating + Product.reviewCount in sync
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recalc_product_rating(p_product_id text)
RETURNS void AS $$
BEGIN
  UPDATE "Product"
  SET
    rating = COALESCE(
      (SELECT AVG(rating)::float8 FROM "Review" WHERE "productId" = p_product_id),
      0
    ),
    "reviewCount" = (SELECT COUNT(*)::int FROM "Review" WHERE "productId" = p_product_id)
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_recalc_product_rating()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_product_rating(OLD."productId");
    RETURN OLD;
  ELSE
    PERFORM recalc_product_rating(NEW."productId");
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS review_recalc_trigger ON "Review";
CREATE TRIGGER review_recalc_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Review"
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_product_rating();

-- ----------------------------------------------------------------------
-- Verify with these queries after the migration runs:
--   SELECT count(*) FROM "Review";       -- should be 0
--   SELECT count(*) FROM "WishlistItem"; -- should be 0
--   \dt+ "Review"                         -- inspect the table
-- ----------------------------------------------------------------------
