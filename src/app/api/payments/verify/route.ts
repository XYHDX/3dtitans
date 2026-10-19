import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getPaymentSettings } from '@/lib/payments/settings';
import { recordReviewedShamCashTransfer } from '@/lib/payments/shamcash-verify';
import { notifyPaymentConfirmed, notifyPaymentRejected } from '@/lib/email';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/verify  body: { orderId, action: 'mark_paid' | 'reject' | 'mark_refunded' }
 *
 * Admin-only manual payment review (bank transfer, Syriatel Cash, Sham Cash
 * transfers that couldn't be matched automatically, cash on delivery).
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    const { orderId, action } = await req.json().catch(() => ({}));
    if (!orderId || !['mark_paid', 'reject', 'mark_refunded'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const { currency } = await getPaymentSettings();

    if (action === 'mark_paid') {
      if (order.paymentStatus === 'paid') return NextResponse.json({ ok: true, paymentStatus: 'paid' });
      if (order.paymentStatus === 'refunded') {
        return NextResponse.json({ error: 'This order was refunded.' }, { status: 400 });
      }
      // If this approves a Sham Cash transfer the customer pointed at, lock that
      // transfer to this order so it can't be reused for another one.
      const conflict = await recordReviewedShamCashTransfer(order.id);
      if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

      await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'paid', paidAt: new Date() } });
      await notifyPaymentConfirmed(order, currency);
      return NextResponse.json({ ok: true, paymentStatus: 'paid' });
    }

    if (action === 'reject') {
      if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') {
        return NextResponse.json({ error: 'A confirmed payment cannot be rejected. Use "Mark refunded" instead.' }, { status: 400 });
      }
      await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'failed' } });
      await notifyPaymentRejected(order, currency);
      return NextResponse.json({ ok: true, paymentStatus: 'failed' });
    }

    // mark_refunded
    if (order.paymentStatus !== 'paid') {
      return NextResponse.json({ error: 'Only paid orders can be marked refunded.' }, { status: 400 });
    }
    await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'refunded', status: 'Cancelled' } });
    return NextResponse.json({ ok: true, paymentStatus: 'refunded' });
  } catch (err: any) {
    console.error('payments/verify POST', err);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}
