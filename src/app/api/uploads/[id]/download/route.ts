import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getStorageAdminClient, MODEL_BUCKET, modelObjectPath } from '@/lib/supabase/server-storage';
import { sanitizeFileName } from '@/lib/supabase/upload-kinds';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/uploads/[id]/download
 *
 * Customers' 3D model files live in the PRIVATE model-uploads bucket. Admins
 * and the store owner the request is assigned to get a 302 to a signed link
 * that expires after 5 minutes.
 *
 * Older rows only stored the (then public) object URL, so the object path is
 * derived from blobPath / downloadURL / fileUrl, whichever resolves.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || (user.role !== 'admin' && user.role !== 'store-owner')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const upload = await prisma.upload.findUnique({
    where: { id },
    select: {
      fileName: true,
      blobPath: true,
      downloadURL: true,
      fileUrl: true,
      assignedOwnerId: true,
      assignedOwnerEmail: true,
    },
  });
  if (!upload) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const assignedToMe =
    upload.assignedOwnerId === user.id ||
    (!!upload.assignedOwnerEmail && !!user.email && upload.assignedOwnerEmail.toLowerCase() === user.email.toLowerCase());
  if (user.role !== 'admin' && !assignedToMe) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const storage = getStorageAdminClient();
  if (!storage) return NextResponse.json({ error: 'File unavailable' }, { status: 503 });

  const blobPath =
    upload.blobPath && !upload.blobPath.includes('://') && !upload.blobPath.includes('..')
      ? upload.blobPath.replace(/^\/+/, '')
      : null;
  const candidates = Array.from(
    new Set([blobPath, modelObjectPath(upload.downloadURL), modelObjectPath(upload.fileUrl)].filter(Boolean) as string[])
  );

  // Save under the customer's original file name (sanitised; keeps the extension).
  const downloadName = sanitizeFileName(upload.fileName || 'model');

  for (const path of candidates) {
    const { data, error } = await storage.storage
      .from(MODEL_BUCKET)
      .createSignedUrl(path, 300, { download: downloadName });
    if (!error && data?.signedUrl) {
      return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'no-store' } });
    }
    if (error) console.error('uploads/download signed url', path, error.message);
  }

  return NextResponse.json({ error: 'File unavailable' }, { status: 404 });
}
