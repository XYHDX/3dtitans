/**
 * ShamCash e-pay ↔ database glue (server only — imports Prisma and the
 * ShamCash client, which reads the AES key).
 *
 * Every status change of a PaymentAttempt goes through applyBillStatus(), which
 * the webhook, the customer status fallback and the reconcile cron all share,
 * so a bill is processed exactly once no matter which path sees it first.
 */
import type { PaymentAttempt } from '@prisma/client';
import { prisma } from '@/lib/db';
import { notifyAdminPaymentIssue, notifyPaymentConfirmed } from '@/lib/email';
import {
  BILL_STATUS,
  SHAMCASH_EPAY_PROVIDER,
  SHAMCASH_RESULT,
  ShamCashEpayError,
  getBillInfo,
} from '@/lib/payments/shamcash-epay';

export type AttemptStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'refunded' | 'partly_refunded';

export type AttemptRef = Pick<PaymentAttempt, 'id' | 'orderId' | 'billNo' | 'amount' | 'currency' | 'status'>;

export type ApplyOutcome = 'paid' | 'expired' | 'still_pending' | 'already_processed' | 'ignored';

type Source = 'webhook' | 'status_check' | 'reconcile';

/** Order payment statuses a ShamCash payment may move forward. */
const PAYABLE_ORDER_STATUSES = ['pending', 'verifying', 'failed'];

/** Attempt statuses a "paid" event may claim. Money arriving always wins over an earlier expired/failed mark. */
const CLAIMABLE_FOR_PAID: AttemptStatus[] = ['pending', 'expired', 'failed'];

/** ShamCash tranIds are LONGs; accept digits only. */
function normalizeTranId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return /^\d{1,30}$/.test(s) ? s : null;
}

/** Run notifications without ever failing (or stalling) the caller. */
async function safeNotify(fn: () => Promise<void>, timeoutMs = 4000) {
  const work = fn().catch((err) => console.error('[shamcash] notification failed', err));
  await Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}

/** Short, secret-free description of an error for logs. */
export function describeShamCashError(err: unknown): string {
  if (err instanceof ShamCashEpayError) {
    return `result=${err.result} kind=${err.kind}${err.httpStatus ? ` http=${err.httpStatus}` : ''}: ${err.message}`;
  }
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}

/**
 * Apply a bill status reported by ShamCash (webhook or getBillInfo) to our
 * attempt + order. Idempotent and race-safe: the attempt row is claimed with a
 * conditional updateMany inside a transaction, so concurrent webhook retries /
 * fallback checks can't double-process. Emails go out after the transaction
 * and can never fail the caller.
 */
export async function applyBillStatus(
  attempt: AttemptRef,
  update: { statusId: number; tranId?: unknown },
  source: Source
): Promise<{ outcome: ApplyOutcome }> {
  const statusId = Number(update.statusId);

  if (statusId === BILL_STATUS.PENDING) return { outcome: 'still_pending' };

  if (statusId === BILL_STATUS.EXPIRED) {
    const res = await prisma.$transaction((tx) =>
      tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: 'pending' }, data: { status: 'expired' } })
    );
    return { outcome: res.count ? 'expired' : 'already_processed' };
  }

  // 4 = paid. 2 / 5 (fully / partly refunded) also mean the bill WAS paid — only
  // seen through getBillInfo when we missed the payment webhook.
  if (statusId !== BILL_STATUS.PAID && statusId !== BILL_STATUS.REFUNDED && statusId !== BILL_STATUS.PARTLY_REFUNDED) {
    console.warn(`[shamcash] ${source}: bill ${attempt.billNo} reported unknown statusId ${statusId} — ignored`);
    return { outcome: 'ignored' };
  }

  const tranId = normalizeTranId(update.tranId);
  if (!tranId) {
    console.error(`[shamcash] ${source}: bill ${attempt.billNo} reported paid without a valid tranId — ignored`);
    return { outcome: 'ignored' };
  }

  const now = new Date();
  const reference = `shamcash-epay:${attempt.billNo}:${tranId}`;

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.paymentAttempt.updateMany({
      where: { id: attempt.id, status: { in: CLAIMABLE_FOR_PAID } },
      data: { status: 'paid', tranId, paidAt: now },
    });
    if (claimed.count === 0) return null; // already processed by another delivery / path

    // The bill amount is fixed when it is created. If an admin changed the order
    // total afterwards (priority surcharge), don't auto-confirm a short payment.
    const order = await tx.order.findUnique({ where: { id: attempt.orderId }, select: { totalAmount: true } });
    const amountOk = !!order && Number(attempt.amount) + 0.005 >= Number(order.totalAmount);

    const orderUpdate = await tx.order.updateMany({
      where: { id: attempt.orderId, paymentStatus: { in: PAYABLE_ORDER_STATUSES } },
      data: amountOk
        ? { paymentStatus: 'paid', paidAt: now, paymentReference: reference }
        : { paymentStatus: 'verifying', paymentReference: reference },
    });

    // ON CONFLICT DO NOTHING — never aborts the transaction on a duplicate.
    const recorded = await tx.paymentTransaction.createMany({
      data: [
        {
          provider: SHAMCASH_EPAY_PROVIDER,
          externalId: tranId,
          orderId: attempt.orderId,
          amount: attempt.amount,
          currency: attempt.currency,
          note: `ShamCash bill ${attempt.billNo}`,
          occurredAt: now,
        },
      ],
      skipDuplicates: true,
    });

    return { orderUpdated: orderUpdate.count === 1, amountOk, recorded: recorded.count === 1 };
  });

  if (!result) return { outcome: 'already_processed' };

  if (!result.recorded) {
    console.warn(`[shamcash] ${source}: tranId ${tranId} (bill ${attempt.billNo}) was already recorded as a payment transaction`);
  }

  const order = await prisma.order.findUnique({
    where: { id: attempt.orderId },
    select: {
      id: true,
      totalAmount: true,
      customerEmail: true,
      shippingName: true,
      paymentMethod: true,
      paymentStatus: true,
      paymentReference: true,
      status: true,
    },
  });

  const issues: string[] = [];
  if (!result.orderUpdated) {
    issues.push(
      `The order was already "${order?.paymentStatus}" (reference ${order?.paymentReference || 'none'}), so this is an extra payment. ` +
        'Refund it from Admin → Orders if it is a duplicate.'
    );
  } else if (!result.amountOk) {
    issues.push(
      `The bill amount (${attempt.currency} ${Number(attempt.amount).toFixed(2)}) is lower than the current order total ` +
        `(${Number(order?.totalAmount ?? 0).toFixed(2)}). The order was set to "under review" instead of paid.`
    );
  }
  if (order?.status === 'Cancelled') issues.push('The order is cancelled — refund the customer.');
  if (statusId !== BILL_STATUS.PAID) {
    issues.push(`ShamCash reports this bill as ${statusId === BILL_STATUS.REFUNDED ? 'fully' : 'partly'} refunded — a refund was made outside 3D Titans; check it.`);
  }

  if (issues.length) {
    console.warn(`[shamcash] ${source}: payment needs attention for bill ${attempt.billNo} / order ${attempt.orderId}: ${issues.join(' ')}`);
  }

  await safeNotify(async () => {
    if (issues.length && order) {
      await notifyAdminPaymentIssue(order, attempt.currency, `ShamCash bill ${attempt.billNo} (transaction ${tranId}) was paid. ${issues.join(' ')}`);
    }
    if (order && result.orderUpdated && result.amountOk && order.status !== 'Cancelled') {
      await notifyPaymentConfirmed(order, attempt.currency);
    }
  });

  return { outcome: 'paid' };
}

/**
 * Fallback reconciliation for ONE pending attempt (doc: use getBillInfo only
 * after ≥ 10 minutes and only when no webhook arrived). `lastCheckedAt` is
 * claimed atomically first, so concurrent callers can't both hit ShamCash, and
 * the same bill is asked about at most once per `minIntervalMs`.
 */
export async function checkAttemptWithShamCash(
  attempt: AttemptRef,
  source: Exclude<Source, 'webhook'>,
  minIntervalMs = 2 * 60 * 1000
): Promise<ApplyOutcome | 'not_found' | 'error' | 'skipped'> {
  const now = new Date();
  const claim = await prisma.paymentAttempt.updateMany({
    where: {
      id: attempt.id,
      status: 'pending',
      OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: new Date(now.getTime() - minIntervalMs) } }],
    },
    data: { lastCheckedAt: now },
  });
  if (claim.count === 0) return 'skipped';

  try {
    const bill = await getBillInfo(attempt.billNo);
    if (bill.billNo && bill.billNo !== attempt.billNo) {
      console.error(`[shamcash] ${source}: getBillInfo(${attempt.billNo}) returned bill ${bill.billNo} — ignored`);
      return 'error';
    }
    const { outcome } = await applyBillStatus(attempt, { statusId: bill.statusId, tranId: bill.tranId }, source);
    return outcome;
  } catch (err) {
    if (err instanceof ShamCashEpayError && err.result === SHAMCASH_RESULT.BILL_NOT_FOUND) {
      // createBill never reached ShamCash (crash / network failure before it) — nothing can be paid.
      await prisma.paymentAttempt.updateMany({ where: { id: attempt.id, status: 'pending' }, data: { status: 'failed' } });
      return 'not_found';
    }
    console.error(`[shamcash] ${source}: getBillInfo(${attempt.billNo}) failed — ${describeShamCashError(err)}`);
    return 'error';
  }
}

/**
 * Public base URL for callbackUrl / redirectUrl:
 *   - Vercel preview: https://$VERCEL_BRANCH_URL (or $VERCEL_URL)
 *   - production:     NEXT_PUBLIC_APP_URL
 *   - local dev:      the request's own origin
 */
export function resolveAppUrl(req: Request): string {
  const strip = (u: string) => u.trim().replace(/\/+$/, '');
  if (process.env.VERCEL_ENV === 'preview') {
    const host = strip(process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL || '').replace(/^https?:\/\//, '');
    if (host) return `https://${host}`;
  }
  const configured = strip(process.env.NEXT_PUBLIC_APP_URL || '');
  const isProduction =
    process.env.VERCEL_ENV === 'production' || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production');
  if (isProduction && configured) return configured;
  return new URL(req.url).origin;
}
