import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { isShamCashEpayConfigured, shamCashEpayConfigProblem } from '@/lib/payments/shamcash-epay';
import { checkAttemptWithShamCash } from '@/lib/payments/shamcash-epay-service';
import { poolStaleOrders } from '@/lib/orders/auto-pool';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const BATCH = 50;
const OLDER_THAN_MS = 11 * 60 * 1000;
const NEWER_THAN_MS = 3 * 24 * 60 * 60 * 1000;
/** Stop starting new getBillInfo calls before the function's time limit. */
const TIME_BUDGET_MS = 45_000;

/**
 * GET /api/payments/shamcash/reconcile
 *
 * Fallback for missed ShamCash webhooks: every ShamCash e-pay attempt still
 * "pending" 11 minutes after creation (ShamCash expires bills after 10) and
 * younger than 3 days is checked ONCE with getBillInfo and applied through
 * applyBillStatus (same code path as the webhook).
 *
 * The same scheduled run also moves orders nobody accepted within 24 h to the
 * shared pool (lib/orders/auto-pool.ts) — that used to happen as a side effect
 * of an admin opening the order list. Callable by:
 *   - a cron job sending "Authorization: Bearer <CRON_SECRET>"
 *     (Vercel Cron does this automatically when CRON_SECRET is set)
 *   - a logged-in admin (the "Check ShamCash payments" button)
 */
function isCron(req: Request) {
  const secret = process.env.CRON_SECRET || '';
  const header = req.headers.get('authorization') || '';
  if (!secret) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!isCron(req)) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Order maintenance runs whether or not ShamCash e-pay is configured.
  let pooled = 0;
  try {
    pooled = await poolStaleOrders();
  } catch (err) {
    console.error('reconcile: auto-pool step failed', err);
  }

  if (!isShamCashEpayConfigured()) {
    return NextResponse.json({
      pooled,
      configured: false,
      checked: 0,
      paid: 0,
      expired: 0,
      stillPending: 0,
      notFound: 0,
      errors: 0,
      message: `ShamCash e-pay is not configured: ${shamCashEpayConfigProblem()}`,
    });
  }

  try {
    const now = Date.now();
    const attempts = await prisma.paymentAttempt.findMany({
      where: {
        status: 'pending',
        createdAt: { lt: new Date(now - OLDER_THAN_MS), gt: new Date(now - NEWER_THAN_MS) },
        OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: new Date(now - 2 * 60 * 1000) } }],
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH,
    });

    const counts = { checked: 0, paid: 0, expired: 0, stillPending: 0, notFound: 0, errors: 0, skipped: 0 };
    for (const attempt of attempts) {
      if (Date.now() - now > TIME_BUDGET_MS) break;
      const outcome = await checkAttemptWithShamCash(attempt, 'reconcile');
      if (outcome === 'skipped') {
        counts.skipped++;
        continue;
      }
      counts.checked++;
      if (outcome === 'paid') counts.paid++;
      else if (outcome === 'expired') counts.expired++;
      else if (outcome === 'still_pending') counts.stillPending++;
      else if (outcome === 'not_found') counts.notFound++;
      else if (outcome === 'error') counts.errors++;
    }

    return NextResponse.json({ pooled, configured: true, candidates: attempts.length, ...counts });
  } catch (err) {
    console.error('shamcash/reconcile', err);
    return NextResponse.json({ error: 'Reconcile failed' }, { status: 500 });
  }
}
