-- =============================================================================
-- Phase 10 — Lock the public schema away from the Supabase Data API
-- =============================================================================
-- WHY: the browser bundle contains NEXT_PUBLIC_SUPABASE_ANON_KEY. On Supabase's
-- defaults, every table in `public` without Row Level Security is readable AND
-- writable through https://<project>.supabase.co/rest/v1/<Table> with that key
-- (password hashes, customer addresses, admin role, payment settings…).
--
-- The app never reads tables through the Data API: all table access goes
-- through Prisma using DATABASE_URL, which connects as the table OWNER
-- (`postgres`). Owners bypass RLS unless FORCE is used, so enabling RLS with
-- NO policies + revoking anon/authenticated grants blocks the public API
-- without affecting the app.
--
-- BEFORE RUNNING (Supabase → SQL editor, as postgres):
--   1. Take a backup (Database → Backups) or confirm PITR is on.
--   2. Confirm the app's DB user owns the tables — every row must show postgres:
--        SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public';
--      The script only changes tables/functions owned by the role running it;
--      anything owned by another role is listed by the verification query.
--   3. Run this whole file. It is idempotent: safe to run again after every
--      future migration (and you should — new tables start unprotected).
-- AFTER RUNNING: both verification queries at the bottom must return 0 rows,
-- and `curl "$SUPABASE_URL/rest/v1/User?select=id" -H "apikey: $ANON_KEY"`
-- must no longer return data.
-- Also: Dashboard → Project Settings → Data API → remove `public` from
-- "Exposed schemas" (the app does not use the Data API at all).
-- =============================================================================

BEGIN;

DO $$
DECLARE r record;
BEGIN
  -- Only tables this role owns (ENABLE RLS requires ownership; one foreign-owned
  -- table would otherwise abort the whole transaction). Anything skipped shows
  -- up in the verification query below.
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Future tables/sequences/functions created by postgres start locked too.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Trigger/helper functions from phase2/phase3: pin search_path (Security Advisor).
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND pg_get_userbyid(p.proowner) = current_user
      -- skip functions that belong to installed extensions
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f.sig);
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------- verification
-- Tables in public without RLS (expect 0 rows)
SELECT c.relname AS table_without_rls
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

-- Remaining grants to the API roles (expect 0 rows)
SELECT table_name, grantee, string_agg(privilege_type, ',') AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
GROUP BY 1, 2;
