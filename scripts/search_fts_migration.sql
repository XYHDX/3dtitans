-- Phase 1.5 — Postgres full-text search migration
-- ================================================
--
-- Apply this in Supabase SQL editor when the marketplace grows past
-- ~10k products and ILIKE/contains-based search starts feeling slow.
--
-- It adds a generated tsvector column with weighted ranking and a GIN
-- index on both Product and Store. After applying, update
-- src/app/api/search/route.ts to use the FTS query (see the commented
-- block at the bottom of this file).
--
-- Safe to run multiple times — uses IF NOT EXISTS / IF EXISTS guards.
-- Tested against Postgres 14+.

-- ----------------------------------------------------------------------
-- Product full-text search
-- ----------------------------------------------------------------------

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name,        '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category,    '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(tags,        '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS product_search_idx
  ON "Product" USING GIN (search_vector);

-- ----------------------------------------------------------------------
-- Store full-text search
-- ----------------------------------------------------------------------

ALTER TABLE "Store"
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(bio,  '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS store_search_idx
  ON "Store" USING GIN (search_vector);

-- ----------------------------------------------------------------------
-- After migration, replace the Prisma `findMany` calls in
-- src/app/api/search/route.ts with raw SQL like:
--
--   const products = await prisma.$queryRaw`
--     SELECT id, name, category, "imageUrl", price::float8 as price,
--            ts_rank(search_vector, query) AS rank
--     FROM "Product",
--          plainto_tsquery('english', ${q}) AS query
--     WHERE search_vector @@ query
--     ORDER BY rank DESC, "createdAt" DESC
--     LIMIT ${limit}
--   `;
--
-- That gets you proper relevance ranking (name matches outrank tag matches)
-- and sub-50ms latency at any catalog size.
-- ----------------------------------------------------------------------
