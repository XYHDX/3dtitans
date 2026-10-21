import { prisma } from '@/lib/db';
import { notifyAdminPaymentIssue, notifyPaymentConfirmed } from '@/lib/email';
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
      // Only the session the order is waiting on can fail it (never a paid or refunded order).
      await prisma.order.updateMany({
        where: { id: orderId, paymentStatus: { in: ['pending', 'verifying'] }, paymentReference: session.id },
        data: { paymentStatus: 'failed' },
      });
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/** Payment states a Stripe payment may move to "paid" from. */
const PAYABLE = ['pending', 'failed', 'verifying'];

async function markStripePaid(orderId: string, session: any) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    console.error(`Stripe webhook: session ${session.id} paid for unknown order ${orderId}`);
    return;
  }

  // The amount Stripe collected must equal the order total (in the order's
  // currency); otherwise leave it for an admin to review instead of silently
  // marking it paid.
  const currency = String(session.currency || '').toUpperCase();
  const expected = Math.round(Number(order.totalAmount) * 100);
  const amountOk = session.amount_total === expected && (!order.currency || order.currency.toUpperCase() === currency);

  let outcome: 'paid' | 'extra' | 'mismatch';
  try {
    outcome = await prisma.$transaction(async (tx) => {
      // Every captured Stripe payment is recorded once (unique provider+session id),
      // so a re-delivered webhook stops here with P2002.
      await tx.paymentTransaction.create({
        data: {
          provider: 'stripe',
          externalId: session.id,
          orderId,
          amount: session.amount_total / 100,
          currency,
          note: `Stripe Checkout ${session.payment_intent || ''}`.trim().slice(0, 500),
          occurredAt: new Date(),
        },
      });
      if (!amountOk) {
        await tx.order.updateMany({
          where: { id: orderId, paymentStatus: { in: PAYABLE } },
          data: { paymentStatus: 'verifying', paymentReference: session.id },
        });
        return 'mismatch' as const;
      }
      const res = await tx.order.updateMany({
        where: { id: orderId, paymentStatus: { in: PAYABLE } },
        data: { paymentStatus: 'paid', paidAt: new Date(), paymentReference: session.id },
      });
      // 0 rows: the order was already paid (another session) or refunded → extra payment.
      return res.count === 1 ? ('paid' as const) : ('extra' as const);
    });
  } catch (err: any) {
    if (err?.code === 'P2002') return; // duplicate webhook delivery — already processed
    throw err;
  }

  if (outcome === 'mismatch') {
    console.error(`Stripe amount mismatch for order ${orderId}: got ${session.amount_total} ${currency}, expected ${expected} ${order.currency || ''}`);
    await notifyAdminPaymentIssue(
      order,
      currency,
      `Stripe session ${session.id} collected ${(session.amount_total / 100).toFixed(2)} ${currency}, which does not match the order total. The order was set to "under review".`
    );
    return;
  }
  if (outcome === 'extra') {
    console.warn(`Stripe webhook: second payment ${session.id} for order ${orderId} (already ${order.paymentStatus}, reference ${order.paymentReference})`);
    await notifyAdminPaymentIssue(
      order,
      currency,
      `Stripe session ${session.id} was paid, but the order was already "${order.paymentStatus}" (reference ${order.paymentReference || 'none'}). ` +
        'This is a duplicate payment: refund it in the Stripe dashboard.'
    );
    return;
  }
  if (order.status === 'Cancelled') {
    await notifyAdminPaymentIssue(
      order,
      currency,
      `Stripe session ${session.id} was paid after the order was cancelled. Refund the customer in the Stripe dashboard, then mark the order refunded.`
    );
    return;
  }
  await notifyPaymentConfirmed(order, currency);
}
