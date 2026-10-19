import { authOptions } from '@/lib/auth/options';
import { reconcileShamCashOrders } from '@/lib/payments/shamcash-verify';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/shamcash/reconcile
 *
 * Matches every open Sham Cash order (last 7 days) against recent incoming
 * transfers. Callable by:
 *   - a cron job sending "Authorization: Bearer <CRON_SECRET>"
 *     (Vercel Cron does this automatically when CRON_SECRET is set)
 *   - a logged-in admin (the "Check Sham Cash payments" button)
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
  try {
    const result = await reconcileShamCashOrders();
    return NextResponse.json(result, { status: result.error ? 502 : 200 });
  } catch (err) {
    console.error('shamcash/reconcile', err);
    return NextResponse.json({ error: 'Reconcile failed' }, { status: 500 });
  }
}
