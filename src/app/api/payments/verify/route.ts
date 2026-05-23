import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * POST /api/payments/verify  body: { orderId, action: 'mark_paid' | 'reject' }
 *
 * Admin-only. Marks payment status and stamps paidAt for accounting.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    const { orderId, action } = await req.json();
    if (!orderId || !['mark_paid', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const data: any = action === 'mark_paid'
      ? { paymentStatus: 'paid', paidAt: new Date() }
      : { paymentStatus: 'failed' };

    await prisma.order.update({ where: { id: orderId }, data });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('payments/verify POST', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
