import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getPaymentSettings, orderCurrency } from '@/lib/payments/settings';
import { MANUAL_PAYMENT_METHODS, orderReference, type PaymentMethodId } from '@/lib/payments/common';
import { normalizePaymentReference } from '@/lib/payments/reference';
import { forgetStatusBeforeCancellation } from '@/lib/orders/cancellation';
import { notifyPaymentConfirmed, notifyPaymentRejected } from '@/lib/email';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Payment states an admin may confirm or reject from. */
const OPEN_PAYMENT = ['pending', 'verifying', 'failed'];

/** Thrown inside the transaction to abort it with a specific response. */
class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

/**
 * POST /api/payments/verify  body: { orderId, action: 'mark_paid' | 'reject' | 'mark_refunded', expectedReference? }
 *
 * Admin-only manual payment review (bank transfer, Sham Cash and Syriatel Cash
 * transfers, cash on delivery). ShamCash e-pay bills are confirmed by the
 * ShamCash webhook; "mark_paid" stays available as a manual override, and
 * real ShamCash e-pay refunds go through /api/payments/shamcash/refund.
 *
 * Approving a manual transfer records it as a PaymentTransaction keyed on the
 * normalised reference, in the same transaction as the "paid" update: the
 * unique (provider, externalId) index makes it impossible to approve the same
 * transfer for two orders. `expectedReference` (what the admin was looking at)
 * makes the approval fail if the customer changed the reference meanwhile.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    const admin = session.user;
    const { orderId, action, expectedReference } = await req.json().catch(() => ({}));
    if (!orderId || typeof orderId !== 'string' || !['mark_paid', 'reject', 'mark_refunded'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const settings = await getPaymentSettings();
    const currency = orderCurrency(order, settings.currency);

    if (action === 'mark_paid') {
      if (order.paymentStatus === 'paid') return NextResponse.json({ ok: true, paymentStatus: 'paid' });
      if (order.paymentStatus === 'refunded') {
        return NextResponse.json({ error: 'This order was refunded.' }, { status: 400 });
      }
      if (order.status === 'Cancelled') {
        return NextResponse.json(
          { error: 'This order is cancelled, so it cannot be marked paid. If the customer paid, refund them.', code: 'order_cancelled' },
          { status: 409 }
        );
      }

      try {
        await prisma.$transaction(async (tx) => {
          // Re-read inside the transaction: the customer may have changed the
          // reference since the admin opened the page.
          const fresh = await tx.order.findUnique({
            where: { id: orderId },
            select: { paymentMethod: true, paymentReference: true, totalAmount: true },
          });
          if (!fresh) throw new HttpError(404, 'Order not found');

          const method = fresh.paymentMethod as PaymentMethodId | null;
          const reference = normalizePaymentReference(fresh.paymentReference);
          if (typeof expectedReference === 'string' && normalizePaymentReference(expectedReference) !== reference) {
            throw new HttpError(409, 'The customer changed the transfer reference since you opened this order. Refresh and check it again.', 'reference_changed');
          }
          if (method && MANUAL_PAYMENT_METHODS.includes(method) && reference) {
            // Unique (provider, externalId): throws P2002 if this transfer already paid another order.
            await tx.paymentTransaction.create({
              data: {
                provider: method,
                externalId: reference,
                orderId,
                amount: fresh.totalAmount,
                currency,
                note: `Approved manually by ${admin.email || admin.id}`.slice(0, 500),
                occurredAt: new Date(),
              },
            });
          }

          const res = await tx.order.updateMany({
            where: { id: orderId, paymentStatus: { in: OPEN_PAYMENT }, status: { not: 'Cancelled' } },
            data: { paymentStatus: 'paid', paidAt: new Date() },
          });
          if (res.count !== 1) {
            throw new HttpError(409, 'This order changed in the meantime (paid, refunded or cancelled). Refresh and check it again.', 'conflict');
          }
        });
      } catch (err) {
        if (err instanceof HttpError) {
          return NextResponse.json({ error: err.message, ...(err.code ? { code: err.code } : {}) }, { status: err.status });
        }
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const current = await prisma.order.findUnique({
            where: { id: orderId },
            select: { paymentMethod: true, paymentReference: true },
          });
          const used = await prisma.paymentTransaction.findFirst({
            where: {
              provider: current?.paymentMethod || '',
              externalId: normalizePaymentReference(current?.paymentReference),
            },
            select: { orderId: true },
          });
          // A double click on this same order: the first click already recorded it.
          if (used?.orderId === orderId) return NextResponse.json({ ok: true, paymentStatus: 'paid' });
          const other = used ? orderReference(used.orderId) : 'another order';
          return NextResponse.json(
            {
              error: `This reference was already used for order ${other}. Check the transfer before confirming.`,
              code: 'reference_reused',
              usedByOrderId: used?.orderId ?? null,
            },
            { status: 409 }
          );
        }
        throw err;
      }
      await notifyPaymentConfirmed(order, currency);
      return NextResponse.json({ ok: true, paymentStatus: 'paid' });
    }

    if (action === 'reject') {
      if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') {
        return NextResponse.json({ error: 'A confirmed payment cannot be rejected. Use "Mark refunded" instead.' }, { status: 400 });
      }
      const res = await prisma.order.updateMany({
        where: { id: orderId, paymentStatus: { in: OPEN_PAYMENT } },
        data: { paymentStatus: 'failed' },
      });
      if (res.count !== 1) {
        return NextResponse.json({ error: 'This order changed in the meantime. Refresh and check it again.', code: 'conflict' }, { status: 409 });
      }
      await notifyPaymentRejected(order, currency);
      return NextResponse.json({ ok: true, paymentStatus: 'failed' });
    }

    // mark_refunded — the only way a paid order becomes "Cancelled".
    if (order.paymentStatus !== 'paid') {
      return NextResponse.json({ error: 'Only paid orders can be marked refunded.' }, { status: 400 });
    }
    const refunded = await prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({
        where: { id: orderId, paymentStatus: 'paid' },
        data: { paymentStatus: 'refunded', status: 'Cancelled' },
      });
      if (res.count === 1) await forgetStatusBeforeCancellation(tx, orderId);
      return res.count === 1;
    });
    if (!refunded) {
      return NextResponse.json({ error: 'This order changed in the meantime. Refresh and check it again.', code: 'conflict' }, { status: 409 });
    }
    console.info(`payments/verify: order ${orderId} marked refunded by ${admin.email || admin.id}`);
    return NextResponse.json({ ok: true, paymentStatus: 'refunded' });
  } catch (err: any) {
    console.error('payments/verify POST', err);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}
