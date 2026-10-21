import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { rateLimitByKey } from '@/lib/rate-limit';
import { MANUAL_PAYMENT_METHODS, type PaymentMethodId } from '@/lib/payments/common';
import { getPaymentSettings, orderCurrency } from '@/lib/payments/settings';
import { normalizePaymentReference } from '@/lib/payments/reference';
import { isOrderCustomer } from '@/lib/orders/access';
import { proofObjectPath } from '@/lib/supabase/server-storage';
import { notifyProofSubmitted } from '@/lib/email';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Payment states in which the customer may (re)submit a proof. */
const PROOF_ACCEPTED_FROM = ['pending', 'failed', 'verifying'];

/**
 * POST /api/payments/proof  body: { orderId, proofUrl?, reference? }
 *
 * The customer attaches a payment proof (screenshot uploaded directly to the
 * private bucket through a signed URL from /api/storage/upload-url, and/or a
 * transfer reference). The order moves to
 * 'verifying' and an admin confirms it in /admin/orders.
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

    // The screenshot must be one THIS user uploaded (signed upload URL from
    // /api/storage/upload-url, stored under "<userId>/..." in the private
    // payment-proofs bucket).
    if (proofUrl) {
      const path = typeof proofUrl === 'string' ? proofObjectPath(proofUrl) : null;
      if (!path || !path.startsWith(`${user.id}/`)) {
        return NextResponse.json({ error: 'Invalid screenshot link. Please upload the screenshot again.' }, { status: 400 });
      }
    }
    const safeReference = typeof reference === 'string' ? reference.trim().slice(0, 200) : '';

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Only the customer who placed the order can attach proof.
    if (!(await isOrderCustomer(order, user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (!MANUAL_PAYMENT_METHODS.includes(order.paymentMethod as PaymentMethodId)) {
      return NextResponse.json({ error: 'This order does not need a payment proof.' }, { status: 400 });
    }
    if (order.status === 'Cancelled') {
      return NextResponse.json({ error: 'This order was cancelled.' }, { status: 400 });
    }
    // Never downgrade a confirmed payment back to "verifying".
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') {
      return NextResponse.json({ error: 'This order is already paid.' }, { status: 400 });
    }

    // A transfer that already paid an order can't be submitted again.
    const normalized = normalizePaymentReference(safeReference);
    if (normalized) {
      const used = await prisma.paymentTransaction.findFirst({
        where: { provider: order.paymentMethod || '', externalId: normalized, orderId: { not: order.id } },
        select: { id: true },
      });
      if (used) {
        return NextResponse.json(
          { error: 'This transfer reference was already used to pay another order. Check the reference and try again.', code: 'reference_reused' },
          { status: 409 }
        );
      }
    }

    // Only the fields the customer sent are written (never values copied from
    // the possibly stale `order` read above), and only while the payment is open.
    const res = await prisma.order.updateMany({
      where: { id: orderId, paymentStatus: { in: PROOF_ACCEPTED_FROM }, status: { not: 'Cancelled' } },
      data: {
        ...(proofUrl ? { paymentProofUrl: proofUrl } : {}),
        ...(safeReference ? { paymentReference: safeReference } : {}),
        paymentStatus: 'verifying',
      },
    });
    if (res.count !== 1) {
      return NextResponse.json(
        { error: 'This order can no longer take a payment proof (it was paid or cancelled meanwhile).', code: 'conflict' },
        { status: 409 }
      );
    }

    const { currency } = await getPaymentSettings();
    await notifyProofSubmitted(order, orderCurrency(order, currency));

    return NextResponse.json({ ok: true, paymentStatus: 'verifying' });
  } catch (err: any) {
    console.error('payments/proof POST', err);
    return NextResponse.json({ error: 'Failed to attach proof' }, { status: 500 });
  }
}
