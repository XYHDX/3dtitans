import { authOptions } from '@/lib/auth/options';
import { rateLimitByKey } from '@/lib/rate-limit';
import { getStorageAdminClient } from '@/lib/supabase/server-storage';
import {
  UPLOAD_KINDS,
  allowedExtension,
  contentTypeForExtension,
  isUploadKind,
  maxMegabytes,
  sanitizeFileName,
} from '@/lib/supabase/upload-kinds';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/storage/upload-url   body: { kind, fileName, size, contentType? }
 *   kind = "model" | "proof" | "image"
 *   -> { bucket, path, token, signedUrl, url, contentType, maxBytes }
 *
 * Files never pass through a Vercel Function (4.5 MB body limit). The server
 * checks who is uploading what, picks the object path and returns a one-time
 * signed upload URL (valid 2 hours, bound to that path, no overwrite). The
 * client then sends the bytes straight to Supabase Storage:
 *
 *   PUT {signedUrl}   Content-Type: {contentType}   body: <file bytes>
 *
 * and afterwards calls the follow-up endpoint with `url` (same format the old
 * /api/storage/upload returned): POST /api/uploads (models) or
 * POST /api/payments/proof (proofs). Product/store images use `url` directly.
 *
 * Bucket size/type limits are enforced by Storage itself
 * (scripts/phase13_storage_lockdown.sql); `size` here is checked up front so
 * customers get a clear error before uploading.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) {
    return NextResponse.json({ error: 'Please log in to upload files.', code: 'login' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  if (!isUploadKind(kind)) {
    return NextResponse.json({ error: "kind must be 'model', 'proof' or 'image'", code: 'bad_request' }, { status: 400 });
  }
  const spec = UPLOAD_KINDS[kind];

  // Per user and kind: admins adding a catalogue upload many product photos.
  const limited = rateLimitByKey(`upload-url:${user.id}:${kind}`, {
    windowMs: 10 * 60 * 1000,
    max: kind === 'image' ? 120 : 30,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many uploads. Please try again in a few minutes.', code: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((limited.retryAfter || 60000) / 1000)) } }
    );
  }

  // Who may upload what.
  if (kind === 'image' && user.role !== 'admin' && user.role !== 'store-owner') {
    return NextResponse.json({ error: 'Only admins and store owners can upload images.', code: 'forbidden' }, { status: 403 });
  }
  if (kind === 'model' && user.role === 'store-owner') {
    return NextResponse.json({ error: 'Store owners cannot send print requests.', code: 'forbidden' }, { status: 403 });
  }

  const fileName = typeof body?.fileName === 'string' && body.fileName.length <= 1000 ? body.fileName : '';
  const ext = fileName ? allowedExtension(kind, fileName) : null;
  if (!ext) {
    return NextResponse.json(
      { error: `Only ${spec.extensions.join(', ')} files are accepted`, code: 'bad_type' },
      { status: 400 }
    );
  }

  const size = Number(body?.size);
  if (!Number.isFinite(size) || size <= 0 || size > spec.maxBytes) {
    return NextResponse.json(
      { error: `File must be smaller than ${maxMegabytes(kind)} MB`, code: 'too_large', maxBytes: spec.maxBytes },
      { status: 400 }
    );
  }

  const storage = getStorageAdminClient();
  if (!storage) {
    console.error('storage/upload-url: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
    return NextResponse.json({ error: 'File uploads are temporarily unavailable.', code: 'not_configured' }, { status: 503 });
  }

  // "<userId>/<timestamp>-<random>-<name><ext>": the follow-up endpoints only
  // accept objects inside the caller's own folder.
  const base = sanitizeFileName(fileName.slice(0, fileName.length - ext.length)).slice(0, 80);
  const random = randomBytes(6).toString('hex');
  const path = `${user.id}/${Date.now()}-${random}-${base}${ext}`;
  // Derived from the validated extension, never from the browser.
  const contentType = contentTypeForExtension(ext);

  try {
    const { data, error } = await storage.storage.from(spec.bucket).createSignedUploadUrl(path);
    if (error || !data?.signedUrl || !data.token) {
      console.error('storage/upload-url createSignedUploadUrl', error);
      return NextResponse.json({ error: 'Could not start the upload. Please try again.', code: 'storage' }, { status: 502 });
    }
    const { data: pub } = storage.storage.from(spec.bucket).getPublicUrl(path);
    return NextResponse.json(
      {
        bucket: spec.bucket,
        path,
        token: data.token,
        signedUrl: data.signedUrl,
        url: pub.publicUrl,
        contentType,
        maxBytes: spec.maxBytes,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('storage/upload-url', err);
    return NextResponse.json({ error: 'Could not start the upload. Please try again.', code: 'storage' }, { status: 502 });
  }
}
