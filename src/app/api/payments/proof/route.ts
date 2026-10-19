import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { rateLimitByKey } from '@/lib/rate-limit';
import { MANUAL_PAYMENT_METHODS } from '@/lib/payments/common';
import { getPaymentSettings } from '@/lib/payments/settings';
import { verifyShamCashOrder } from '@/lib/payments/shamcash-verify';
import { proofObjectPath } from '@/lib/supabase/server-storage';
import { notifyProofSubmitted } from '@/lib/email';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/proof  body: { orderId, proofUrl?, reference? }
 *
 * The customer attaches a payment proof (screenshot uploaded through
 * /api/storage/upload and/or a transfer reference). For Sham Cash with the API
 * configured we first try to verify automatically; otherwise the order moves
 * to 'verifying' and an admin confirms it in /admin/orders.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    if (!rateLimitByKey(`payment-proof:${user.id}`, { windowMs: 10 * 60 * 1000, max: 10 }).ok) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { orderId, proofUrl, reference } = body || {};
    if (!orderId || typeof orderId !== 'string') return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    if (!proofUrl && !reference) {
      return NextResponse.json({ error: 'Provide a screenshot or a transfer reference' }, { status: 400 });
    }

    // The screenshot must be one THIS user uploaded through /api/storage/upload
    // (stored under "<userId>/..." in the private payment-proofs bucket).
    if (proofUrl) {
      const path = proofObjectPath(proofUrl);
      if (!path || !path.startsWith(`${user.id}/`)) {
        return NextResponse.json({ error: 'Invalid screenshot link. Please upload the screenshot again.' }, { status: 400 });
      }
    }
    const safeReference = typeof reference === 'string' ? reference.trim().slice(0, 200) : '';

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Only the customer who placed the order can attach proof.
    const owns = order.userId
      ? order.userId === user.id
      : !!order.customerEmail && !!user.email && order.customerEmail.toLowerCase() === user.email.toLowerCase();
    if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (!MANUAL_PAYMENT_METHODS.includes(order.paymentMethod as any)) {
      return NextResponse.json({ error: 'This order does not need a payment proof.' }, { status: 400 });
    }
    if (order.status === 'Cancelled') {
      return NextResponse.json({ error: 'This order was cancelled.' }, { status: 400 });
    }
    // Never downgrade a confirmed payment back to "verifying".
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') {
      return NextResponse.json({ error: 'This order is already paid.' }, { status: 400 });
    }

    // Sham Cash with the API connected: try to confirm instantly.
    if (order.paymentMethod === 'sham_cash') {
      const auto = await verifyShamCashOrder(order.id, safeReference || undefined);
      if (auto.outcome === 'paid') {
        if (proofUrl) await prisma.order.update({ where: { id: order.id }, data: { paymentProofUrl: proofUrl } });
        return NextResponse.json({ ok: true, paymentStatus: 'paid' });
      }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProofUrl: proofUrl || order.paymentProofUrl || null,
        paymentReference: safeReference || order.paymentReference || null,
        paymentStatus: 'verifying',
      },
    });

    const { currency } = await getPaymentSettings();
    await notifyProofSubmitted(order, currency);

    return NextResponse.json({ ok: true, paymentStatus: 'verifying' });
  } catch (err: any) {
    console.error('payments/proof POST', err);
    return NextResponse.json({ error: 'Failed to attach proof' }, { status: 500 });
  }
}
