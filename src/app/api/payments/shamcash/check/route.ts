import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { rateLimitByKey } from '@/lib/rate-limit';
import { verifyShamCashOrder } from '@/lib/payments/shamcash-verify';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/shamcash/check  body: { orderId, transactionId? }
 *
 * "I've paid — check now". Looks the transfer up through the Sham Cash API and
 * marks the order paid if it matches (see lib/payments/shamcash-verify.ts).
 * Only the customer who placed the order (or an admin) can trigger it.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    if (!rateLimitByKey(`shamcash-check:${user.id}`, { windowMs: 10 * 60 * 1000, max: 10 }).ok) {
      return NextResponse.json({ error: 'Too many checks. Please wait a few minutes.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
    const transactionId = typeof body?.transactionId === 'string' || typeof body?.transactionId === 'number'
      ? String(body.transactionId)
      : undefined;
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (user.role !== 'admin' && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await verifyShamCashOrder(orderId, transactionId);
    return NextResponse.json(result, { status: result.outcome === 'error' ? 502 : 200 });
  } catch (err) {
    console.error('shamcash/check POST', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
