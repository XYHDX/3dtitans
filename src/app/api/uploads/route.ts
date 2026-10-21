import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { rateLimitByKey } from '@/lib/rate-limit';
import { getStorageAdminClient, MODEL_BUCKET, modelObjectPath, statStorageObject } from '@/lib/supabase/server-storage';
import { UPLOAD_KINDS, allowedExtension } from '@/lib/supabase/upload-kinds';

/**
 * URL allowlist for user-supplied file links.
 *
 * We only accept URLs that:
 *  - Use https
 *  - Point at our own Supabase Storage host (whatever NEXT_PUBLIC_SUPABASE_URL
 *    is set to), so an attacker can't make us store a link to e.g. a phishing
 *    server that we'd later display to admins.
 */
function isAllowedStorageUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  try {
    const supaHost = new URL(supaUrl).host;
    if (!supaHost) return false;
    return url.host === supaHost;
  } catch {
    // If we don't know what host to allow, refuse all to be safe.
    return false;
  }
}

function mapUpload(upload: any) {
  return {
    id: upload.id,
    modelName: upload.modelName,
    fileName: upload.fileName,
    filePath: upload.blobPath || '',
    fileUrl: upload.fileUrl,
    downloadURL: upload.downloadURL,
    notes: upload.notes || '',
    userId: upload.userId,
    userEmail: upload.userEmail || '',
    userDisplayName: upload.userDisplayName || '',
    phoneNumber: upload.phoneNumber,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
    assignedOwnerId: upload.assignedOwnerId || null,
    assignedOwnerEmail: upload.assignedOwnerEmail || null,
    status: upload.status,
    // Model files live in a PRIVATE bucket: download through this route
    // (admins + the assigned store owner), never through downloadURL.
    downloadPath: `/api/uploads/${upload.id}/download`,
  };
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || (user.role !== 'admin' && user.role !== 'store-owner')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uploads = await prisma.upload.findMany({
    where:
      user.role === 'admin'
        ? {}
        : {
            OR: [
              { assignedOwnerId: user.id },
              { assignedOwnerEmail: user.email || '' },
            ],
          },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ uploads: uploads.map(mapUpload) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Per account, not per IP: Syrian mobile carriers put many customers behind
  // one IP. Prevents a single account from flooding the uploads table.
  const limited = rateLimitByKey(`uploads:${user.id}`, { windowMs: 10 * 60 * 1000, max: 20 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many uploads. Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((limited.retryAfter || 60000) / 1000)) } }
    );
  }
  if (user.role === 'store-owner') return NextResponse.json({ error: 'Store owners cannot upload files' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { fileUrl, downloadURL, filePath } = body || {};
  const modelName = clip(body?.modelName, 200);
  // Keep the end of very long names so the extension survives.
  const fileName = typeof body?.fileName === 'string' ? body.fileName.trim().slice(-255) : '';
  const notes = clip(body?.notes, 4000);
  const phoneNumber = clip(body?.phoneNumber, 40);

  if (!modelName || !fileName || !downloadURL) {
    return NextResponse.json({ error: 'Model name, file name, and downloadURL are required' }, { status: 400 });
  }

  const modelSpec = UPLOAD_KINDS.model;
  if (!allowedExtension('model', fileName)) {
    return NextResponse.json({ error: `Only ${modelSpec.extensions.join(', ')} files are accepted` }, { status: 400 });
  }

  // URL allowlist — both the downloadURL and (if provided) fileUrl must come from
  // our own Supabase Storage host. Otherwise an attacker could insert a link to
  // a phishing site that admins later open.
  if (!isAllowedStorageUrl(downloadURL)) {
    return NextResponse.json({ error: 'downloadURL must be a Supabase Storage URL on this project' }, { status: 400 });
  }
  if (fileUrl && !isAllowedStorageUrl(fileUrl)) {
    return NextResponse.json({ error: 'fileUrl must be a Supabase Storage URL on this project' }, { status: 400 });
  }

  // The file must be one THIS user uploaded (via /api/storage/upload-url or the
  // legacy /api/storage/upload) into "<userId>/..." of the model-uploads bucket.
  const path = modelObjectPath(downloadURL);
  if (
    !path ||
    !path.startsWith(`${user.id}/`) ||
    !allowedExtension('model', path) ||
    (typeof filePath === 'string' && filePath && filePath !== path) ||
    (fileUrl && fileUrl !== downloadURL && modelObjectPath(fileUrl) !== path)
  ) {
    return NextResponse.json({ error: 'Invalid file link. Please upload the file again.' }, { status: 400 });
  }

  // Confirm the upload really finished and respects the size limit.
  const storage = getStorageAdminClient();
  if (!storage) {
    console.error('uploads POST: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
    return NextResponse.json({ error: 'File uploads are temporarily unavailable.' }, { status: 503 });
  }
  let stored: { size: number } | null;
  try {
    stored = await statStorageObject(storage, MODEL_BUCKET, path);
  } catch (err) {
    console.error('uploads POST stat', err);
    return NextResponse.json({ error: 'Could not verify the uploaded file. Please try again.' }, { status: 502 });
  }
  if (!stored) {
    return NextResponse.json({ error: 'The file upload did not finish. Please upload the file again.' }, { status: 400 });
  }
  if (!(stored.size > 0) || stored.size > modelSpec.maxBytes) {
    return NextResponse.json({ error: 'The file is empty or too large.' }, { status: 400 });
  }

  const upload = await prisma.upload.create({
    data: {
      modelName,
      fileName,
      fileUrl: downloadURL,
      downloadURL,
      blobPath: path,
      notes,
      phoneNumber,
      userId: user.id,
      userEmail: user.email || '',
      userDisplayName: user.name || user.email || 'User',
      status: 'new',
    },
  });

  return NextResponse.json({ upload: mapUpload(upload) });
}
