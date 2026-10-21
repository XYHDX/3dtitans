import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { rateLimitByKey } from '@/lib/rate-limit';
import { isShamCashEpayConfigured } from '@/lib/payments/shamcash-epay';
import { checkAttemptWithShamCash } from '@/lib/payments/shamcash-epay-service';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

/** Doc: query getBillInfo only as a fallback, ≥ 10 minutes after creation. */
const FALLBACK_AFTER_MS = 10.5 * 60 * 1000;
const FALLBACK_MIN_INTERVAL_MS = 2 * 60 * 1000;

/**
 * GET /api/payments/shamcash/status?orderId=…
 *
 * What the checkout success page polls while waiting for ShamCash. Reads our
 * database only (the webhook updates it) — EXCEPT the documented fallback:
 * when the latest attempt is still pending > 10.5 min after creation and was
 * not checked in the last 2 min, ask ShamCash once via getBillInfo.
 *
 * Response: { orderPaymentStatus, attempt: { status, billNo, expiresAt, paymentUrl? } | null }
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    if (!rateLimitByKey(`shamcash-status:${user.id}`, { windowMs: 10 * 60 * 1000, max: 300 }).ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const orderId = (new URL(req.url).searchParams.get('orderId') || '').trim();
    if (!orderId || orderId.length > 64) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, paymentStatus: true },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (user.role !== 'admin' && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let attempt = await prisma.paymentAttempt.findFirst({ where: { orderId }, orderBy: { createdAt: 'desc' } });
    let orderPaymentStatus = order.paymentStatus;

    const now = Date.now();
    if (
      attempt &&
      attempt.status === 'pending' &&
      attempt.createdAt.getTime() < now - FALLBACK_AFTER_MS &&
      (!attempt.lastCheckedAt || attempt.lastCheckedAt.getTime() < now - FALLBACK_MIN_INTERVAL_MS) &&
      isShamCashEpayConfigured()
    ) {
      const outcome = await checkAttemptWithShamCash(attempt, 'status_check', FALLBACK_MIN_INTERVAL_MS);
      if (outcome !== 'skipped') {
        const [freshAttempt, freshOrder] = await Promise.all([
          prisma.paymentAttempt.findUnique({ where: { id: attempt.id } }),
          prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } }),
        ]);
        attempt = freshAttempt || attempt;
        orderPaymentStatus = freshOrder?.paymentStatus || orderPaymentStatus;
      }
    }

    const canResume = attempt?.status === 'pending' && !!attempt.paymentUrl && attempt.expiresAt.getTime() > now;
    return NextResponse.json(
      {
        orderPaymentStatus,
        attempt: attempt
          ? {
              status: attempt.status,
              billNo: attempt.billNo,
              expiresAt: attempt.expiresAt,
              ...(canResume ? { paymentUrl: attempt.paymentUrl } : {}),
            }
          : null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('shamcash/status GET', err);
    return NextResponse.json({ error: 'Failed to load payment status' }, { status: 500 });
  }
}
