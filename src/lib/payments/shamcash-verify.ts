import { prisma } from '@/lib/db';
import { orderReference } from '@/lib/payments/common';
import { getPaymentSettings } from '@/lib/payments/settings';
import { notifyPaymentConfirmed, notifyProofSubmitted } from '@/lib/email';
import {
  isShamCashApiConfigured,
  listShamCashTransactions,
  ShamCashError,
  type ShamCashTransaction,
} from '@/lib/payments/shamcash';

/**
 * Matching rules — an incoming Sham Cash transfer pays an order only when ALL hold:
 *   1. the order is a Sham Cash order that is not paid / cancelled
 *   2. same currency as the store currency
 *   3. amount >= order total (customer may round up, never down)
 *   4. it arrived after the order was created (10 min clock-skew allowance)
 *   5. the transfer's NOTE contains the order reference (e.g. "3DT-AB12CD34")
 *   6. the transfer was never used for another order (DB unique constraint)
 *
 * If the customer gives us a transaction id whose amount/currency/time match but
 * the note is missing, we DON'T auto-approve (transaction ids can be guessed);
 * the order goes to 'verifying' and an admin confirms it in one click.
 */

const PROVIDER = 'sham_cash';
const CLOCK_SKEW_MS = 10 * 60 * 1000;
const RETRYABLE_STATUSES = ['pending', 'verifying', 'failed'];

export type ShamCashCheckResult =
  | { outcome: 'paid'; transactionId: string }
  | { outcome: 'needs_review'; transactionId: string; message: string }
  | { outcome: 'not_found'; message: string }
  | { outcome: 'not_applicable'; message: string }
  | { outcome: 'error'; message: string };

type OrderForMatch = {
  id: string;
  createdAt: Date;
  totalAmount: unknown;
  paymentMethod: string | null;
  paymentStatus: string;
  status: string;
  customerEmail: string | null;
  shippingName: string;
};

const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

function noteMatches(note: string | undefined, orderId: string): boolean {
  if (!note) return false;
  const n = normalize(note);
  // Accept "3DT-AB12CD34", "3dt ab12cd34" or just "AB12CD34".
  return n.includes(normalize(orderReference(orderId))) || n.includes(orderId.slice(-8).toUpperCase());
}

function basicMatch(tx: ShamCashTransaction, order: OrderForMatch, currency: string): boolean {
  const total = Number(order.totalAmount);
  if (!Number.isFinite(total) || total <= 0) return false;
  if ((tx.currency?.code || '').toUpperCase() !== currency) return false;
  if (!(Number(tx.amount) + 0.005 >= total)) return false;
  const at = Date.parse(tx.occurred_at);
  if (!Number.isFinite(at) || at < order.createdAt.getTime() - CLOCK_SKEW_MS) return false;
  return true;
}

async function usedTransactionIds(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const rows = await prisma.paymentTransaction.findMany({
    where: { provider: PROVIDER, externalId: { in: ids } },
    select: { externalId: true },
  });
  return new Set(rows.map((r) => r.externalId));
}

/** Atomically record the transfer and mark the order paid. Returns false if the transfer was already used. */
async function claimTransaction(order: OrderForMatch, tx: ShamCashTransaction, currency: string): Promise<boolean> {
  const externalId = String(tx.transaction_id);
  try {
    await prisma.$transaction([
      prisma.paymentTransaction.create({
        data: {
          provider: PROVIDER,
          externalId,
          orderId: order.id,
          amount: Number(tx.amount),
          currency,
          senderName: tx.sender_name?.slice(0, 200) || null,
          note: tx.note?.slice(0, 500) || null,
          occurredAt: Number.isFinite(Date.parse(tx.occurred_at)) ? new Date(tx.occurred_at) : null,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'paid', paidAt: new Date(), paymentReference: `shamcash:${externalId}` },
      }),
    ]);
  } catch (err: any) {
    if (err?.code === 'P2002') return false; // already used for another order
    throw err;
  }
  await notifyPaymentConfirmed(order, currency);
  return true;
}

function eligibility(order: OrderForMatch): string | null {
  if (order.paymentMethod !== 'sham_cash') return 'This order is not a Sham Cash order.';
  if (order.paymentStatus === 'paid') return 'This order is already paid.';
  if (order.status === 'Cancelled') return 'This order was cancelled.';
  if (!RETRYABLE_STATUSES.includes(order.paymentStatus)) return 'This order cannot be verified automatically.';
  return null;
}

/**
 * Check one order against the Sham Cash API. `customerTransactionId` is the
 * optional transaction number the customer typed in.
 */
export async function verifyShamCashOrder(orderId: string, customerTransactionId?: string): Promise<ShamCashCheckResult> {
  if (!isShamCashApiConfigured()) {
    return { outcome: 'not_applicable', message: 'Automatic Sham Cash verification is not configured.' };
  }
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { outcome: 'error', message: 'Order not found.' };
  const notEligible = eligibility(order);
  if (notEligible) return { outcome: 'not_applicable', message: notEligible };

  const { currency } = await getPaymentSettings();
  const txId = (customerTransactionId || '').replace(/\D/g, '').slice(0, 20);

  let txs: ShamCashTransaction[];
  try {
    txs = await listShamCashTransactions({
      since: new Date(order.createdAt.getTime() - CLOCK_SKEW_MS),
      currency,
      limit: 200,
    });
    // A specific id may be older than the newest 200 — fetch it directly too.
    if (txId && !txs.some((t) => String(t.transaction_id) === txId)) {
      txs = txs.concat(await listShamCashTransactions({ transactionIds: [txId], currency }));
    }
  } catch (err) {
    const msg = err instanceof ShamCashError ? `${err.code}: ${err.message}` : String(err);
    console.error('Sham Cash verify: API call failed', msg);
    return { outcome: 'error', message: 'Could not reach Sham Cash right now. Please try again in a few minutes.' };
  }

  const used = await usedTransactionIds(txs.map((t) => String(t.transaction_id)));
  const candidates = txs.filter((t) => !used.has(String(t.transaction_id)) && basicMatch(t, order, currency));

  // Strong match: the note carries this order's reference.
  for (const tx of candidates.filter((t) => noteMatches(t.note, order.id))) {
    if (await claimTransaction(order, tx, currency)) {
      return { outcome: 'paid', transactionId: String(tx.transaction_id) };
    }
  }

  if (txId && used.has(txId)) {
    return { outcome: 'not_found', message: 'This transfer was already used to pay another order.' };
  }

  // Weak match: customer-supplied transaction id without the reference in the note.
  if (txId) {
    const tx = candidates.find((t) => String(t.transaction_id) === txId);
    if (tx) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'verifying', paymentReference: `shamcash:${txId}` },
      });
      await notifyProofSubmitted(order, currency);
      return {
        outcome: 'needs_review',
        transactionId: txId,
        message: 'We found your transfer. Our team will confirm it shortly.',
      };
    }
  }

  return {
    outcome: 'not_found',
    message: `We couldn't find a matching transfer yet. Make sure you sent at least ${currency} ${Number(order.totalAmount).toFixed(2)} with "${orderReference(order.id)}" in the note. Transfers can take a minute to appear.`,
  };
}

/**
 * Admin-confirm path for a 'needs_review' order: records the transfer the
 * customer pointed at, so the same transfer can't be reused for another order.
 * Returns an error message, or null on success / when there is nothing to record.
 */
export async function recordReviewedShamCashTransfer(orderId: string): Promise<string | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  const ref = order?.paymentReference || '';
  if (!order || order.paymentMethod !== 'sham_cash' || !ref.startsWith('shamcash:')) return null;
  const externalId = ref.slice('shamcash:'.length);
  const { currency } = await getPaymentSettings();
  try {
    await prisma.paymentTransaction.create({
      data: { provider: PROVIDER, externalId, orderId, amount: Number(order.totalAmount), currency },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const existing = await prisma.paymentTransaction.findUnique({
        where: { provider_externalId: { provider: PROVIDER, externalId } },
      });
      if (existing && existing.orderId !== orderId) {
        return `Sham Cash transfer ${externalId} was already used to pay another order.`;
      }
      return null;
    }
    throw err;
  }
  return null;
}

/**
 * Batch reconcile (for a cron job / admin button): fetch recent transfers once
 * and match them against every open Sham Cash order by note reference.
 */
export async function reconcileShamCashOrders(): Promise<{ checked: number; paid: string[]; error?: string }> {
  if (!isShamCashApiConfigured()) return { checked: 0, paid: [], error: 'Sham Cash API is not configured.' };

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      paymentMethod: 'sham_cash',
      paymentStatus: { in: RETRYABLE_STATUSES },
      status: { not: 'Cancelled' },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
  if (!orders.length) return { checked: 0, paid: [] };

  const { currency } = await getPaymentSettings();
  let txs: ShamCashTransaction[];
  try {
    txs = await listShamCashTransactions({
      since: new Date(orders[0].createdAt.getTime() - CLOCK_SKEW_MS),
      currency,
      limit: 200,
    });
  } catch (err) {
    const msg = err instanceof ShamCashError ? `${err.code}: ${err.message}` : String(err);
    return { checked: orders.length, paid: [], error: msg };
  }

  const used = await usedTransactionIds(txs.map((t) => String(t.transaction_id)));
  const paid: string[] = [];
  for (const order of orders) {
    const tx = txs.find(
      (t) =>
        !used.has(String(t.transaction_id)) &&
        basicMatch(t, order, currency) &&
        noteMatches(t.note, order.id)
    );
    if (tx && (await claimTransaction(order, tx, currency))) {
      used.add(String(tx.transaction_id));
      paid.push(order.id);
    }
  }
  return { checked: orders.length, paid };
}
