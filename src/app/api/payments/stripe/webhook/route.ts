import { prisma } from '@/lib/db';
import { notifyPaymentConfirmed } from '@/lib/email';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/stripe/webhook
 *
 * Stripe → us, signed with STRIPE_WEBHOOK_SECRET.
 *
 * Set this up in your Stripe dashboard:
 *   1. Developers → Webhooks → Add endpoint
 *   2. URL = https://3dtitans.org/api/payments/stripe/webhook
 *   3. Events = checkout.session.completed,
 *               checkout.session.async_payment_succeeded,
 *               checkout.session.async_payment_failed
 *   4. Copy the signing secret (whsec_…) into STRIPE_WEBHOOK_SECRET on Vercel
 */
export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    console.error('Stripe webhook: missing env vars');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const body = await req.text();

  let event: any;
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, { apiVersion: '2024-10-28.acacia' as any });
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Stripe signature verification failed:', err.message);
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }

  try {
    const session = event.data?.object as any;
    const orderId: string | undefined = session?.metadata?.orderId;

    if (orderId && (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded')) {
      if (session.payment_status === 'paid') {
        await markStripePaid(orderId, session);
      } else {
        // Delayed payment methods: completed but money not captured yet.
        await prisma.order.updateMany({
          where: { id: orderId, paymentStatus: { in: ['pending', 'failed'] } },
          data: { paymentStatus: 'verifying', paymentReference: session.id },
        });
      }
    } else if (orderId && event.type === 'checkout.session.async_payment_failed') {
      await prisma.order.updateMany({
        where: { id: orderId, paymentStatus: { not: 'paid' } },
        data: { paymentStatus: 'failed' },
      });
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function markStripePaid(orderId: string, session: any) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus === 'paid') return;

  // The amount Stripe collected must equal the order total; otherwise leave it
  // for an admin to review instead of silently marking it paid.
  const expected = Math.round(Number(order.totalAmount) * 100);
  if (session.amount_total !== expected) {
    console.error(`Stripe amount mismatch for order ${orderId}: got ${session.amount_total}, expected ${expected}`);
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'verifying', paymentReference: session.id },
    });
    return;
  }

  try {
    await prisma.$transaction([
      prisma.paymentTransaction.create({
        data: {
          provider: 'stripe',
          externalId: session.id,
          orderId,
          amount: session.amount_total / 100,
          currency: String(session.currency || '').toUpperCase(),
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'paid', paidAt: new Date(), paymentReference: session.id },
      }),
    ]);
  } catch (err: any) {
    if (err?.code === 'P2002') return; // duplicate webhook delivery — already processed
    throw err;
  }
  await notifyPaymentConfirmed(order, String(session.currency || '').toUpperCase());
}
