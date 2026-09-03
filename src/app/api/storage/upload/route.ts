import { authOptions } from '@/lib/auth/options';
import { rateLimit } from '@/lib/rate-limit';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Service-role Supabase client, created here on purpose: `lib/supabase/admin.ts`
 * is marked `'use server'`, and Next.js only allows async-function exports from
 * such files, so importing its client object breaks the production build.
 */
function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * POST /api/storage/upload  (multipart/form-data)
 *
 *   fields: kind = "model" | "proof", file = <binary>
 *   -> { url, path, bucket, size, contentType }
 *
 * Server-side upload to Supabase Storage using the service-role client, so
 * clients (website + mobile app) never need the Supabase anon key and the
 * bucket policies can stay locked down. The returned `url` is exactly what
 * `/api/uploads` (downloadURL) and `/api/payments/proof` (proofUrl) accept.
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on the server, and
 * NEXT_PUBLIC_SUPABASE_URL (same project host) for the URL allowlists.
 */
const KINDS = {
  model: {
    bucket: 'model-uploads',
    maxBytes: 25 * 1024 * 1024,
    extensions: ['.stl'],
    defaultContentType: 'model/stl',
  },
  proof: {
    bucket: 'payment-proofs',
    maxBytes: 10 * 1024 * 1024,
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.pdf'],
    defaultContentType: 'application/octet-stream',
  },
} as const;

type Kind = keyof typeof KINDS;

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return (cleaned || 'file').slice(-100);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, 'storage-upload', { windowMs: 10 * 60 * 1000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'File storage is not configured on the server (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const kind = String(form.get('kind') || '') as Kind;
  const spec = KINDS[kind];
  if (!spec) return NextResponse.json({ error: "kind must be 'model' or 'proof'" }, { status: 400 });

  const entry = form.get('file') as any;
  if (!entry || typeof entry === 'string' || typeof entry.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  const originalName: string = String(entry.name || 'file');
  const size: number = Number(entry.size || 0);
  const lowerName = originalName.toLowerCase();

  if (!spec.extensions.some((ext) => lowerName.endsWith(ext))) {
    return NextResponse.json(
      { error: `Only ${spec.extensions.join(', ')} files are accepted` },
      { status: 400 }
    );
  }
  if (!Number.isFinite(size) || size <= 0 || size > spec.maxBytes) {
    return NextResponse.json(
      { error: `File must be between 1 byte and ${Math.round(spec.maxBytes / 1024 / 1024)} MB` },
      { status: 400 }
    );
  }

  const path = `${user.id}/${Date.now()}-${sanitizeFileName(originalName)}`;
  const contentType: string = (entry.type as string) || spec.defaultContentType;
  const bytes = Buffer.from(await entry.arrayBuffer());

  try {
    // Make sure the bucket exists (public read, so the links stored on orders /
    // uploads open for admins and store owners).
    const { data: bucket } = await supabaseAdmin.storage.getBucket(spec.bucket);
    if (!bucket) {
      const { error: createErr } = await supabaseAdmin.storage.createBucket(spec.bucket, {
        public: true,
        fileSizeLimit: spec.maxBytes,
      });
      if (createErr && !/already exists/i.test(createErr.message)) {
        console.error('storage/upload createBucket', createErr);
        return NextResponse.json({ error: 'Could not prepare the storage bucket' }, { status: 500 });
      }
    }

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
