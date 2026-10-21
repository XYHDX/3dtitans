import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { rateLimitByKey } from '@/lib/rate-limit';
import { orderReference } from '@/lib/payments/common';
import { getPaymentSettings, orderCurrency } from '@/lib/payments/settings';
import {
  BILL_LIFETIME_MS,
  BILL_STATUS,
  SHAMCASH_EPAY_PROVIDER,
  SHAMCASH_RESULT,
  ShamCashEpayError,
  createBill,
  getBillInfo,
  roundAmount,
  shamCashCurrencyId,
  type ShamCashBill,
} from '@/lib/payments/shamcash-epay';
import { checkAttemptWithShamCash, describeShamCashError, resolveAppUrl } from '@/lib/payments/shamcash-epay-service';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// createBill (+ one retry and a getBillInfo on 1704) can take up to ~45 s worst case.
export const maxDuration = 60;

/** Reuse a pending bill only while it still has comfortable time left. */
const REUSE_WINDOW_MS = 9 * 60 * 1000;
/**
 * A pending attempt without a paymentUrl younger than this is still being
 * created by another request (createBill in flight; maxDuration is 60 s).
 * Asking ShamCash about it now would get "not found" and wrongly fail it.
 */
const IN_FLIGHT_MS = 90 * 1000;
const FRIENDLY_ERROR = 'ShamCash payment could not be started. Please try again in a few minutes.';

function isSafeRedirectUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Bill returned for an existing billNo (1704) must really be OUR pending bill for this amount. */
function billMatches(bill: ShamCashBill, amount: number, currencyId: number): boolean {
  return (
    bill.statusId === BILL_STATUS.PENDING &&
    Math.abs(Number(bill.amount) - amount) < 0.005 &&
    Number(bill.currencyId) === currencyId &&
    isSafeRedirectUrl(bill.paymentUrl)
  );
}

/**
 * POST /api/payments/shamcash/create  body: { orderId }
 *
 * Just-in-time ShamCash bill creation (called when the customer presses
 * "Pay with ShamCash"). Returns { paymentUrl, billNo, expiresAt }; the browser
 * then navigates to paymentUrl (ShamCash app or website). The amount is the
 * order's server-side total — never taken from the client.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    if (!rateLimitByKey(`shamcash-create:${user.id}`, { windowMs: 10 * 60 * 1000, max: 10 }).ok) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.', code: 'rate_limited' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
    if (!orderId || orderId.length > 64) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, totalAmount: true, currency: true, paymentMethod: true, paymentStatus: true, status: true },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (user.role !== 'admin' && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (order.paymentMethod !== 'sham_cash_epay') {
      return NextResponse.json({ error: 'This order is not a ShamCash online-payment order.' }, { status: 400 });
    }
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'This order is already paid.', code: 'already_paid' }, { status: 409 });
    }
    if (order.status === 'Cancelled') {
      return NextResponse.json({ error: 'This order was cancelled.', code: 'cancelled' }, { status: 400 });
    }
    if (!['pending', 'failed'].includes(order.paymentStatus)) {
      return NextResponse.json({ error: 'This order cannot be paid right now.', code: 'not_payable' }, { status: 400 });
    }

    const settings = await getPaymentSettings();
    // Bill in the currency the order was priced in (legacy orders: the store currency).
    const currency = orderCurrency(order, settings.currency);
    const currencyId = shamCashCurrencyId(currency);
    if (!settings.available.sham_cash_epay || !currencyId) {
      return NextResponse.json({ error: 'ShamCash online payment is not available right now.', code: 'unavailable' }, { status: 503 });
    }

    const amount = roundAmount(Number(order.totalAmount));
    if (!Number.isFinite(amount) || amount < 0.01) {
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    // 1. At most one open bill per order (also enforced by the partial unique
    //    index "PaymentAttempt_one_pending_per_order", phase9 SQL).
    //    - A young pending bill for the same amount → send the customer back to it.
    //    - An older pending bill may have been PAID at ShamCash while its webhook
    //      is late or lost: ask ShamCash once before opening a new bill, so the
    //      customer can never be charged twice. If ShamCash can't be reached,
    //      refuse rather than risk a second bill.
    const now = Date.now();
    const pending = await prisma.paymentAttempt.findMany({
      where: { orderId: order.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    for (const att of pending) {
      if (!att.paymentUrl && now - att.createdAt.getTime() < IN_FLIGHT_MS) {
        return NextResponse.json(
          { error: 'Your ShamCash payment is being prepared. Please try again in a few seconds.', code: 'payment_in_progress' },
          { status: 409 }
        );
      }
      const young = now - att.createdAt.getTime() < REUSE_WINDOW_MS;
      const sameBill = Math.abs(Number(att.amount) - amount) < 0.005 && att.currency === currency;
      if (young && sameBill && att.paymentUrl) {
        return NextResponse.json({ paymentUrl: att.paymentUrl, billNo: att.billNo, expiresAt: att.expiresAt });
      }
      const outcome = await checkAttemptWithShamCash(att, 'status_check', 0);
      if (outcome === 'error') {
        return NextResponse.json(
          { error: 'We could not confirm your previous ShamCash payment yet. Please try again in a minute.', code: 'previous_bill_unconfirmed' },
          { status: 503 }
        );
      }
      if (outcome === 'still_pending') {
        // ShamCash still shows the bill as open: it expires on its own within minutes.
        if (att.paymentUrl && sameBill) {
          return NextResponse.json({ paymentUrl: att.paymentUrl, billNo: att.billNo, expiresAt: att.expiresAt });
        }
        return NextResponse.json(
          { error: 'A previous ShamCash payment for this order is still open. Please try again in a few minutes.', code: 'previous_bill_open' },
          { status: 409 }
        );
      }
    }
    const fresh = await prisma.order.findUnique({ where: { id: order.id }, select: { paymentStatus: true } });
    if (fresh?.paymentStatus === 'paid' || fresh?.paymentStatus === 'verifying') {
      return NextResponse.json({ error: 'This order is already paid.', code: 'already_paid' }, { status: 409 });
    }

    // 2. New attempt row BEFORE calling ShamCash, so a crash can never lose a billNo.
    //    billNo = "3DT-AB12CD34-<n>" (doc: don't map the order id 1:1 to billNo).
    const ref = orderReference(order.id);
    let attempt = null as Awaited<ReturnType<typeof prisma.paymentAttempt.create>> | null;
    let n = (await prisma.paymentAttempt.count({ where: { orderId: order.id } })) + 1;
    for (let i = 0; i < 5 && !attempt; i++, n++) {
      try {
        attempt = await prisma.paymentAttempt.create({
          data: {
            orderId: order.id,
            provider: SHAMCASH_EPAY_PROVIDER,
            billNo: `${ref}-${n}`,
            amount,
            currency,
            status: 'pending',
            expiresAt: new Date(now + BILL_LIFETIME_MS),
          },
        });
      } catch (err: any) {
        if (err?.code !== 'P2002') throw err;
        const target = String(err?.meta?.target ?? '');
        if (!target.includes('billNo')) {
          // Another request opened a bill for this order a moment ago (double click).
          const other = await prisma.paymentAttempt.findFirst({
            where: { orderId: order.id, status: 'pending' },
            orderBy: { createdAt: 'desc' },
          });
          if (other?.paymentUrl) {
            return NextResponse.json({ paymentUrl: other.paymentUrl, billNo: other.billNo, expiresAt: other.expiresAt });
          }
          return NextResponse.json(
            { error: 'Your ShamCash payment is being prepared. Please try again in a few seconds.', code: 'payment_in_progress' },
            { status: 409 }
          );
        }
        // billNo taken by a concurrent request → next number
      }
    }
    if (!attempt) return NextResponse.json({ error: FRIENDLY_ERROR }, { status: 503 });

    const appUrl = resolveAppUrl(req);
    const billParams = {
      billNo: attempt.billNo,
      amount,
      currencyId,
      callbackUrl: `${appUrl}/api/payments/shamcash/webhook`,
      redirectUrl: `${appUrl}/checkout/success?orderId=${encodeURIComponent(order.id)}&shamcash=return`,
      note: `3D Titans order ${ref}`,
    };

    // 3. Create the bill. A transport failure is retried once with the SAME billNo;
    //    1704 then means the first request did reach ShamCash → fetch that bill.
    let bill: ShamCashBill | null = null;
    let failure: unknown = null;
    for (let tryNo = 0; tryNo < 2 && !bill; tryNo++) {
      try {
        bill = await createBill(billParams);
        failure = null;
      } catch (err) {
        failure = err;
        if (err instanceof ShamCashEpayError && err.result === SHAMCASH_RESULT.BILL_NO_EXISTS) {
          try {
            const existing = await getBillInfo(attempt.billNo);
            if (billMatches(existing, amount, currencyId)) {
              bill = existing;
              failure = null;
            } else {
              failure = new ShamCashEpayError(SHAMCASH_RESULT.BILL_NO_EXISTS, `billNo ${attempt.billNo} exists at ShamCash with different data (status ${existing.statusId}, amount ${existing.amount}, currency ${existing.currencyId})`, { kind: 'api' });
            }
          } catch (infoErr) {
            failure = infoErr;
          }
          break;
        }
        if (!(err instanceof ShamCashEpayError && err.retryable)) break;
      }
    }

    if (!bill || !isSafeRedirectUrl(bill.paymentUrl)) {
      const reason = bill ? 'createBill returned no usable paymentUrl' : describeShamCashError(failure);
      console.error(`[shamcash] create: bill ${attempt.billNo} for order ${order.id} failed — ${reason}`);
      await prisma.paymentAttempt.updateMany({ where: { id: attempt.id, status: 'pending' }, data: { status: 'failed' } });
      return NextResponse.json({ error: FRIENDLY_ERROR, code: 'provider_error' }, { status: 502 });
    }

    // Only hand out the link while this attempt is still the order's open bill.
    // If something marked it failed/expired meanwhile, the bill simply expires
    // at ShamCash (and a late payment would still be claimed by the webhook).
    const saved = await prisma.paymentAttempt.updateMany({
      where: { id: attempt.id, status: 'pending' },
      data: { paymentUrl: bill.paymentUrl },
    });
    if (saved.count !== 1) {
      console.warn(`[shamcash] create: bill ${attempt.billNo} was no longer pending when its paymentUrl arrived — not returned`);
      return NextResponse.json(
        { error: 'Your ShamCash payment is being prepared. Please try again in a few seconds.', code: 'payment_in_progress' },
        { status: 409 }
      );
    }
    return NextResponse.json({ paymentUrl: bill.paymentUrl, billNo: attempt.billNo, expiresAt: attempt.expiresAt });
  } catch (err) {
    console.error('shamcash/create POST', err);
    return NextResponse.json({ error: FRIENDLY_ERROR }, { status: 500 });
  }
}
