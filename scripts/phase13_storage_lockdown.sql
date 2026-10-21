-- =============================================================================
-- Phase 13 — Lock down Supabase Storage (buckets + storage.objects policies)
-- =============================================================================
-- WHY:
--   * Product images and store avatars/covers used to be uploaded from the
--     browser with the PUBLIC anon key, which only works if anonymous users may
--     write to the `product-images` bucket — so anyone could upload or
--     overwrite files there (audit H-02).
--   * `model-uploads` (customers' 3D files) was a PUBLIC bucket (audit M-09).
--   * Bucket limits were (re)set by the upload route on every request.
--
-- NOW every upload goes through a one-time signed upload URL issued by the
-- server (POST /api/storage/upload-url, service role) and every private file
-- is read through short-lived signed links issued by the server:
--   /api/uploads/[id]/download      (model files: admins + assigned store owner)
--   /api/payments/proof/view        (payment screenshots)
-- The service role bypasses RLS, so the app needs NO policies on
-- storage.objects at all.
--
-- ORDER OF OPERATIONS (important):
--   1. Deploy the code that uses /api/storage/upload-url FIRST. Running this
--      before the deploy breaks product-image uploads in the old admin pages
--      (they still write with the anon key) and old model links.
--   2. Supabase Dashboard → Storage → Settings → "Upload file size limit":
--      set it to at least 100 MB. A bucket limit can never exceed this global
--      limit, and the Free plan caps it at 50 MB (100 MB 3D models need Pro).
--   3. Supabase → SQL editor (role postgres): run the optional inspection query
--      in section 0, then run this whole file. It is idempotent: safe to re-run.
--   4. Run the verification queries at the bottom.
--
-- EFFECT ON EXISTING DATA:
--   * Files stay where they are. Old public links to model files stop working
--     (expected): admins/store owners download through the dashboard button,
--     which derives the object path from the stored URL.
--   * Product images keep their public URLs (bucket stays public for reading).
--   * Limits/types only apply to NEW uploads.
-- ROLLBACK (emergency only): UPDATE storage.buckets SET public = true WHERE id = 'model-uploads';
-- =============================================================================

-- ---------------------------------------------------------------- 0. inspect
-- (Optional, run on its own first) every policy that currently exists on
-- storage.objects — keep a copy of the output before dropping anything.
--
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
-- ORDER BY policyname;

BEGIN;

-- ---------------------------------------------------------------- 1. buckets
-- Create the buckets if missing, otherwise update visibility, size limit and
-- allowed content types. Sizes are bytes. The content types match what the
-- upload routes send (derived server-side from the file extension).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Product photos + store avatars/covers: public READ, 5 MB, images only.
  ('product-images', 'product-images', true, 5242880,
     ARRAY['image/jpeg', 'image/png', 'image/webp']),
  -- Customers' 3D models: PRIVATE, 100 MB, STL / 3MF / OBJ.
  ('model-uploads', 'model-uploads', false, 104857600,
     ARRAY['model/stl', 'application/sla', 'application/vnd.ms-pki.stl',
           'model/3mf', 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
           'model/obj', 'text/plain', 'application/octet-stream']),
  -- Payment screenshots: PRIVATE, 10 MB, images + PDF (HEIC for iPhone photos
  -- picked in the mobile app).
  ('payment-proofs', 'payment-proofs', false, 10485760,
     ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
           'application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public             = EXCLUDED.public,
    file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------- 2. policies
-- Drop every storage.objects policy granted to anon / authenticated / public
-- that touches one of these three buckets, or that is not limited to any
-- bucket at all (such a policy also opens these buckets). This includes
-- SELECT policies: the private buckets must not be readable through the
-- Storage API, and the public product-images bucket does not need a SELECT
-- policy for its public URLs (a SELECT policy would only let anyone LIST it).
-- Policies limited to OTHER buckets are kept. Each decision is printed as a
-- NOTICE (see the "Messages" tab) so you have a record of what was removed.
DO $$
DECLARE
  r   record;
  def text;
BEGIN
  FOR r IN
    SELECT policyname, cmd, roles,
           coalesce(qual, '') AS qual,
           coalesce(with_check, '') AS with_check
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND roles && ARRAY['anon', 'authenticated', 'public']::name[]
  LOOP
    def := r.qual || ' ' || r.with_check;
    IF def ~ '(product-images|model-uploads|payment-proofs)' OR def !~ 'bucket_id' THEN
      RAISE NOTICE 'DROP policy "%" (% to %) USING (%) WITH CHECK (%)',
        r.policyname, r.cmd, r.roles, r.qual, r.with_check;
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    ELSE
      RAISE NOTICE 'KEEP policy "%" (% to %) — limited to other buckets: %',
        r.policyname, r.cmd, r.roles, def;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------- verification
-- 1) Bucket settings (expect: product-images public=true 5242880;
--    model-uploads public=false 104857600; payment-proofs public=false 10485760)
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('product-images', 'model-uploads', 'payment-proofs')
ORDER BY id;

-- 2) Remaining policies that could open these buckets to API users
--    (expect 0 rows)
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND roles && ARRAY['anon', 'authenticated', 'public']::name[]
  AND (
        (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '(product-images|model-uploads|payment-proofs)'
     OR (coalesce(qual, '') || ' ' || coalesce(with_check, '')) !~ 'bucket_id'
  );

-- 3) From a terminal (replace the placeholders), all of these must FAIL:
--    # anonymous upload into product-images  → 400/403 "new row violates row-level security policy"
--    curl -X POST "$SUPABASE_URL/storage/v1/object/product-images/test.png" \
--      -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--      -H "Content-Type: image/png" --data-binary @some.png
--    # public link to a model file → 400 "Bucket not found"/not public
--    curl -I "$SUPABASE_URL/storage/v1/object/public/model-uploads/<userId>/<file>.stl"
--    And in the app: add a product image, send a print request (> 5 MB STL),
--    upload a payment screenshot, download a model from /admin/uploads.
