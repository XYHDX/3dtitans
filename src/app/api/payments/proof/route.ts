import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * POST /api/payments/proof  body: { orderId, proofUrl?, reference? }
 *
 * Customer attaches a payment proof (screenshot URL from Supabase Storage
 * and/or a transfer reference). Sets the order's paymentStatus to 'verifying'.
 * Admin reviews via the orders dashboard and marks paid or rejected.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { orderId, proofUrl, reference } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    if (!proofUrl && !reference) {
      return NextResponse.json({ error: 'Provide a proof URL or reference' }, { status: 400 });
    }

    // Confirm ownership — only the customer who placed the order can attach proof
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const userEmail = session.user.email || '';
    const owns =
      (!!order.userId && order.userId === session.user.id) ||
      (!!order.customerEmail && order.customerEmail.toLowerCase() === userEmail.toLowerCase());
    if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProofUrl: proofUrl || (order as any).paymentProofUrl || null,
        paymentReference: reference || (order as any).paymentReference || null,
        paymentStatus: 'verifying',
      } as any,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('payments/proof POST', err);
    return NextResponse.json({ error: err?.message || 'Failed to attach proof' }, { status: 500 });
  }
}
