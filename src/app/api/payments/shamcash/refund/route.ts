import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { forgetStatusBeforeCancellation } from '@/lib/orders/cancellation';
import { rateLimitByKey } from '@/lib/rate-limit';
import {
  SHAMCASH_EPAY_REFUND_PROVIDER,
  SHAMCASH_RESULT,
  ShamCashEpayError,
  describeShamCashResult,
  hasAtMostTwoDecimals,
  refundBill,
  roundAmount,
} from '@/lib/payments/shamcash-epay';
import { describeShamCashError } from '@/lib/payments/shamcash-epay-service';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const REFUNDABLE_ATTEMPT_STATUSES = ['paid', 'partly_refunded'];

/** Admin-facing message for a refund failure. */
function refundErrorMessage(err: unknown): { message: string; status: number; retryable: boolean } {
  if (err instanceof ShamCashEpayError) {
    switch (err.result) {
      case SHAMCASH_RESULT.BALANCE_NOT_ENOUGH:
        return { message: 'Your ShamCash business balance is too low to cover this refund. Top it up and try again.', status: 409, retryable: false };
      case SHAMCASH_RESULT.RECEIVER_BLOCKED:
        return { message: "The customer's ShamCash account is blocked from receiving money. Refund them another way.", status: 409, retryable: false };
      case SHAMCASH_RESULT.ORIGIN_BILL_NOT_PAID:
        return { message: 'ShamCash says this bill is not paid (or no longer refundable).', status: 409, retryable: false };
      case SHAMCASH_RESULT.REFUND_EXCEEDS_REMAINING:
        return { message: 'The refund is larger than what is left to refund on this bill at ShamCash.', status: 409, retryable: false };
    }
    if (err.retryable) {
      return {
        message: 'Could not reach ShamCash — the refund may or may not have gone through. Press refund again with the same amount: the retry is safe (same idempotency key).',
        status: 502,
        retryable: true,
      };
    }
    const hint = describeShamCashResult(err.result);
    return { message: `ShamCash refused the refund${err.result ? ` (code ${err.result})` : ''}: ${hint || err.message}`, status: 502, retryable: false };
  }
  return { message: 'Refund failed.', status: 500, retryable: false };
}

/**
 * POST /api/payments/shamcash/refund   (admin only)
 * body: { orderId, amount?, note?, billNo?, idempotencyKey? }
 *
 * Refunds a paid ShamCash e-pay bill (full by default, or partial). The money
 * goes back to the customer's ShamCash wallet from the business balance.
 * `idempotencyKey` is only sent back by the admin UI when retrying a refund
 * that timed out — ShamCash's success-only idempotency makes that retry safe.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    if (!rateLimitByKey(`shamcash-refund:${session.user.id}`, { windowMs: 10 * 60 * 1000, max: 20 }).ok) {
      return NextResponse.json({ error: 'Too many refund attempts. Please wait a few minutes.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    const adminNote = typeof body?.note === 'string' ? body.note.trim().slice(0, 200) : '';
    const requestedBillNo = typeof body?.billNo === 'string' ? body.billNo.trim() : '';
    const retryKey =
      typeof body?.idempotencyKey === 'string' && /^[A-Za-z0-9-]{10,100}$/.test(body.idempotencyKey) ? body.idempotencyKey : '';

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, paymentMethod: true, paymentStatus: true, paymentReference: true },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const attempt = requestedBillNo
      ? await prisma.paymentAttempt.findFirst({ where: { billNo: requestedBillNo, orderId, status: { in: REFUNDABLE_ATTEMPT_STATUSES } } })
      : await prisma.paymentAttempt.findFirst({
          where: { orderId, status: { in: REFUNDABLE_ATTEMPT_STATUSES } },
          orderBy: { paidAt: 'desc' },
        });
    if (!attempt) {
      return NextResponse.json({ error: 'No paid ShamCash bill found for this order.' }, { status: 400 });
    }

    // Refunds already made for THIS bill (note is prefixed with "[billNo]").
    const notePrefix = `[${attempt.billNo}]`;
    const agg = await prisma.paymentTransaction.aggregate({
      where: { provider: SHAMCASH_EPAY_REFUND_PROVIDER, orderId, note: { startsWith: notePrefix } },
      _sum: { amount: true },
    });
    const billAmount = Number(attempt.amount);
    const refundedSoFar = roundAmount(Number(agg._sum.amount ?? 0));
    const remaining = roundAmount(billAmount - refundedSoFar);
    if (remaining < 0.01) {
      return NextResponse.json({ error: 'This bill has already been fully refunded.' }, { status: 400 });
    }

    let amount = remaining;
    if (body?.amount !== undefined && body?.amount !== null && body?.amount !== '') {
      amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || !hasAtMostTwoDecimals(amount)) {
        return NextResponse.json({ error: 'Amount must be a positive number with at most 2 decimals.' }, { status: 400 });
      }
      amount = roundAmount(amount);
      if (amount > remaining + 0.005) {
        return NextResponse.json(
          { error: `Amount is more than what is left to refund (${attempt.currency} ${remaining.toFixed(2)}).` },
          { status: 400 }
        );
      }
    }

    const idempotencyKey = retryKey || randomUUID();
    let tranId: string;
    try {
      ({ tranId } = await refundBill({ billNo: attempt.billNo, amount, idempotencyKey, note: adminNote || undefined }));
    } catch (err) {
      console.error(`[shamcash] refund: bill ${attempt.billNo} amount ${amount} failed — ${describeShamCashError(err)}`);
      const { message, status, retryable } = refundErrorMessage(err);
      return NextResponse.json(
        { error: message, ...(err instanceof ShamCashEpayError && err.result ? { result: err.result } : {}), ...(retryable ? { retryKey: idempotencyKey } : {}) },
        { status }
      );
    }

    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const recorded = await tx.paymentTransaction.createMany({
          data: [
            {
              provider: SHAMCASH_EPAY_REFUND_PROVIDER,
              externalId: tranId,
              orderId,
              amount,
              currency: attempt.currency,
              note: `${notePrefix} ${adminNote || 'Refund'}`.slice(0, 500),
              occurredAt: new Date(),
            },
          ],
          skipDuplicates: true, // an idempotent retry echoes the same tranId
        });
        const totalRefunded = roundAmount(refundedSoFar + (recorded.count ? amount : 0));
        const fully = totalRefunded + 0.005 >= billAmount;
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: { status: fully ? 'refunded' : 'partly_refunded' },
        });
        // Only the bill that actually paid the order flips the order to "refunded"
        // (refunding a duplicate second payment leaves the order paid).
        const isOrdersPayment = (order.paymentReference || '').startsWith(`shamcash-epay:${attempt.billNo}:`);
        let orderPaymentStatus = order.paymentStatus;
        if (fully && isOrdersPayment) {
          // Same outcome as the manual "Mark refunded": a fully refunded order is cancelled.
          await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'refunded', status: 'Cancelled' } });
          await forgetStatusBeforeCancellation(tx, orderId);
          orderPaymentStatus = 'refunded';
        }
        return { totalRefunded, fully, orderPaymentStatus };
      });

      return NextResponse.json({
        ok: true,
        tranId,
        billNo: attempt.billNo,
        refunded: amount,
        totalRefunded: outcome.totalRefunded,
        remaining: roundAmount(billAmount - outcome.totalRefunded),
        attemptStatus: outcome.fully ? 'refunded' : 'partly_refunded',
        orderPaymentStatus: outcome.orderPaymentStatus,
      });
    } catch (dbErr) {
      console.error(`[shamcash] refund: ShamCash refunded bill ${attempt.billNo} (tranId ${tranId}, ${amount}) but saving it failed`, dbErr);
      return NextResponse.json(
        { error: `ShamCash completed the refund (transaction ${tranId}) but saving it here failed. Do NOT refund again — note the transaction id and contact the developer.` },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('shamcash/refund POST', err);
    return NextResponse.json({ error: 'Refund failed' }, { status: 500 });
  }
}
