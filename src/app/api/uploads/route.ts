import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

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
  };
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
  // Rate-limit before doing any DB work — prevents authenticated-but-malicious
  // users from flooding the uploads table with junk metadata.
  const limited = rateLimit(req, 'uploads', { windowMs: 10 * 60 * 1000, max: 20 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many uploads. Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((limited.retryAfter || 60000) / 1000)) } }
    );
  }

  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'store-owner') return NextResponse.json({ error: 'Store owners cannot upload files' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { modelName, fileName, fileUrl, downloadURL, notes, phoneNumber } = body || {};

  if (!modelName || !fileName || !downloadURL) {
    return NextResponse.json({ error: 'Model name, file name, and downloadURL are required' }, { status: 400 });
  }

  const safeFileName = String(fileName || '').toLowerCase();
  if (!safeFileName.endsWith('.stl')) {
    return NextResponse.json({ error: 'Only .stl files are accepted' }, { status: 400 });
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

  const upload = await prisma.upload.create({
    data: {
      modelName,
      fileName,
      fileUrl: fileUrl || downloadURL,
      downloadURL,
      notes: notes || '',
      phoneNumber: phoneNumber || '',
      userId: user.id,
      userEmail: user.email || '',
      userDisplayName: user.name || user.email || 'User',
      status: 'new',
    },
  });

  return NextResponse.json({ upload: mapUpload(upload) });
}
