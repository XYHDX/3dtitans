-- =============================================================================
-- Phase 11 — Indexes for foreign keys and hot filters
-- =============================================================================
-- Postgres does not index foreign keys automatically, and Prisma doesn't
-- either. These cover the lookups the app runs on every order list, product
-- page, upload list and payment check. Mirrored as @@index in schema.prisma.
--
-- Plain CREATE INDEX (not CONCURRENTLY) so it runs in the Supabase SQL editor;
-- at today's table sizes each one takes milliseconds. Idempotent.
-- =============================================================================

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx"            ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx"          ON "OrderItem"("productId");
CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx"       ON "Order"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx"       ON "Order"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_paymentMethod_paymentStatus_createdAt_idx"
                                                               ON "Order"("paymentMethod", "paymentStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_customerEmail_idx"          ON "Order"("customerEmail");
CREATE INDEX IF NOT EXISTS "OrderAssignment_ownerId_idx"      ON "OrderAssignment"("ownerId");
CREATE INDEX IF NOT EXISTS "Product_uploaderId_idx"           ON "Product"("uploaderId");
CREATE INDEX IF NOT EXISTS "Product_storeId_idx"              ON "Product"("storeId");
CREATE INDEX IF NOT EXISTS "Product_createdAt_idx"            ON "Product"("createdAt");
CREATE INDEX IF NOT EXISTS "Upload_userId_idx"                ON "Upload"("userId");
CREATE INDEX IF NOT EXISTS "Upload_assignedOwnerId_idx"       ON "Upload"("assignedOwnerId");
CREATE INDEX IF NOT EXISTS "Upload_createdAt_idx"             ON "Upload"("createdAt");
CREATE INDEX IF NOT EXISTS "Account_userId_idx"               ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx"               ON "Session"("userId");

-- Verify
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE '%\_idx' ESCAPE '\'
ORDER BY tablename, indexname;
