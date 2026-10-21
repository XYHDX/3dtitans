import { authOptions } from '@/lib/auth/options';
import { rateLimit } from '@/lib/rate-limit';
import { getStorageAdminClient } from '@/lib/supabase/server-storage';
import {
  UPLOAD_KINDS,
  allowedExtension,
  contentTypeForExtension,
  sanitizeFileName,
} from '@/lib/supabase/upload-kinds';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * LEGACY  POST /api/storage/upload  (multipart/form-data)
 *
 *   fields: kind = "model" | "proof", file = <binary>
 *   -> { url, path, bucket, size, contentType }
 *
 * Kept only for older mobile app builds. New clients use
 * POST /api/storage/upload-url and upload straight to Storage, because Vercel
 * rejects request bodies over 4.5 MB before this code even runs — so this
 * route only accepts files up to 4 MB.
 *
 * Buckets are configured once in scripts/phase13_storage_lockdown.sql (this
 * route no longer creates or re-configures them).
 */
const LEGACY_MAX_BYTES = 4 * 1024 * 1024;
const LEGACY_KINDS = ['model', 'proof'] as const;
type LegacyKind = (typeof LEGACY_KINDS)[number];

export async function POST(req: Request) {
  const limited = rateLimit(req, 'storage-upload', { windowMs: 10 * 60 * 1000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const supabaseAdmin = getStorageAdminClient();
  if (!supabaseAdmin) {
    console.error('storage/upload: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
    return NextResponse.json({ error: 'File uploads are temporarily unavailable.' }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const kind = String(form.get('kind') || '') as LegacyKind;
  if (!LEGACY_KINDS.includes(kind)) {
    return NextResponse.json({ error: "kind must be 'model' or 'proof'" }, { status: 400 });
  }
  const spec = UPLOAD_KINDS[kind];

  const entry = form.get('file') as any;
  if (!entry || typeof entry === 'string' || typeof entry.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  const originalName: string = String(entry.name || 'file');
  const size: number = Number(entry.size || 0);

  const ext = allowedExtension(kind, originalName);
  if (!ext) {
    return NextResponse.json(
      { error: `Only ${spec.extensions.join(', ')} files are accepted` },
      { status: 400 }
    );
  }
  if (!Number.isFinite(size) || size <= 0 || size > LEGACY_MAX_BYTES) {
    return NextResponse.json(
      { error: 'This file is too large for this version of the app. Please update the app or upload it on the website.' },
      { status: 413 }
    );
  }

  const base = sanitizeFileName(originalName.slice(0, originalName.length - ext.length)).slice(0, 80);
  const path = `${user.id}/${Date.now()}-${randomBytes(6).toString('hex')}-${base}${ext}`;
  // Derive the content type from the (already validated) extension instead of
  // trusting the client, so nobody can store e.g. HTML disguised as an image.
  const contentType = contentTypeForExtension(ext);
  const bytes = Buffer.from(await entry.arrayBuffer());

  try {
    const { error: upErr } = await supabaseAdmin.storage
      .from(spec.bucket)
      .upload(path, bytes, { contentType, upsert: false });
    if (upErr) {
      console.error('storage/upload upload', upErr);
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(spec.bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path, bucket: spec.bucket, size, contentType });
  } catch (err) {
    console.error('storage/upload', err);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
