import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getStorageAdminClient, PROOF_BUCKET, proofObjectPath } from '@/lib/supabase/server-storage';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/proof/view?orderId=...
 *
 * Payment screenshots live in a PRIVATE bucket. This route checks that the
 * viewer is an admin (or the customer who uploaded it) and redirects to a
 * signed link that expires after 5 minutes.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orderId = new URL(req.url).searchParams.get('orderId') || '';
  const order = orderId
    ? await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true, paymentProofUrl: true } })
    : null;
  if (!order?.paymentProofUrl) return NextResponse.json({ error: 'No proof for this order' }, { status: 404 });
  if (user.role !== 'admin' && order.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const path = proofObjectPath(order.paymentProofUrl);
  const storage = getStorageAdminClient();
  if (!path || !storage) return NextResponse.json({ error: 'Proof file unavailable' }, { status: 404 });

  const { data, error } = await storage.storage.from(PROOF_BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    console.error('proof/view signed url', error);
    return NextResponse.json({ error: 'Proof file unavailable' }, { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl, { headers: { 'Cache-Control': 'no-store' } });
}
