import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * URL allowlist — only accept proof image URLs from our own Supabase Storage
 * project. Without this, a malicious user could submit a link to any web page
 * and admins reviewing the order would later open it.
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
    return false;
  }
}

/**
 * POST /api/payments/proof  body: { orderId, proofUrl?, reference? }
 *
 * Customer attaches a payment proof (screenshot URL from Supabase Storage
 * and/or a transfer reference). Sets the order's paymentStatus to 'verifying'.
 * Admin reviews via the orders dashboard and marks paid or rejected.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { orderId, proofUrl, reference } = body || {};
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    if (!proofUrl && !reference) {
      return NextResponse.json({ error: 'Provide a proof URL or reference' }, { status: 400 });
    }
    // If a URL was supplied, it must point at our Supabase Storage host.
    if (proofUrl && !isAllowedStorageUrl(proofUrl)) {
      return NextResponse.json({ error: 'proofUrl must be a Supabase Storage URL on this project' }, { status: 400 });
    }
    // Cap reference text so a buggy/malicious client can't push a huge blob.
    const safeReference = typeof reference === 'string' ? reference.trim().slice(0, 200) : '';

    // Confirm ownership — only the customer who placed the order can attach proof
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const userEmail = session.user.email || '';
    const owns =
      (!!order.userId && order.userId === session.user.id) ||
      (!!order.customerEmail && order.customerEmail.toLowerCase() === userEmail.toLowerCase());
    if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProofUrl: proofUrl || (order as any).paymentProofUrl || null,
        paymentReference: safeReference || (order as any).paymentReference || null,
        paymentStatus: 'verifying',
      } as any,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('payments/proof POST', err);
    return NextResponse.json({ error: err?.message || 'Failed to attach proof' }, { status: 500 });
  }
}
