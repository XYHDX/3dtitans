import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { rateLimitByKey } from '@/lib/rate-limit';
import { orderReference } from '@/lib/payments/common';
import { getPaymentSettings, isStripeCurrency, orderCurrency } from '@/lib/payments/settings';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Checkout sessions expire after 31–32 minutes (Stripe's minimum is 30). */
const SESSION_LIFETIME_MIN = 32;

/**
 * POST /api/payments/stripe/checkout  body: { orderId }
 *
 * Returns the hosted-checkout URL for the order's server-side total. One open
 * Checkout Session per order: a second click (or a second tab) gets the same
 * session back instead of a new one, so the customer can't pay twice. The
 * webhook marks the order paid.
 *
 * Requires env vars:
 *   STRIPE_SECRET_KEY        (sk_test_… or sk_live_…)
 *   STRIPE_WEBHOOK_SECRET    (whsec_… from your endpoint in Stripe dashboard)
 *   NEXT_PUBLIC_APP_URL      (https://3dtitans.org)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    if (!rateLimitByKey(`stripe-checkout:${session.user.id}`, { windowMs: 10 * 60 * 1000, max: 10 }).ok) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 });
    }
    const { orderId } = await req.json().catch(() => ({}));
    if (!orderId || typeof orderId !== 'string') return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const settings = await getPaymentSettings();
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || !settings.available.stripe) {
      return NextResponse.json({ error: 'Card payment is not available right now.' }, { status: 503 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (order.paymentMethod !== 'stripe') {
      return NextResponse.json({ error: 'This order is not a card-payment order.' }, { status: 400 });
    }
    if (order.status === 'Cancelled' || !['pending', 'failed'].includes(order.paymentStatus)) {
      return NextResponse.json({ error: 'This order cannot be paid right now.' }, { status: 400 });
    }
    const currencyCode = orderCurrency(order, settings.currency);
    if (!isStripeCurrency(currencyCode)) {
      return NextResponse.json({ error: `Card payments are not available in ${currencyCode}.` }, { status: 503 });
    }
    const currency = currencyCode.toLowerCase();

    const amount = Math.round(Number(order.totalAmount) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    // Dynamic import so the bundle doesn't carry stripe if it isn't used
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, { apiVersion: '2024-10-28.acacia' as any });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://3dtitans.org';

    // 1. Reuse the order's existing Checkout Session while it is still open.
    const previousId = order.paymentReference && order.paymentReference.startsWith('cs_') ? order.paymentReference : null;
    if (previousId) {
      try {
        const previous = await stripe.checkout.sessions.retrieve(previousId);
        if (previous.metadata?.orderId === order.id) {
          if (previous.status === 'complete') {
            return NextResponse.json(
              { error: 'This order has already been paid by card. It will show as paid shortly.', code: 'already_paid' },
              { status: 409 }
            );
          }
          if (
            previous.status === 'open' &&
            previous.url &&
            previous.amount_total === amount &&
            previous.currency === currency
          ) {
            return NextResponse.json({ url: previous.url });
          }
          // Open but for an old amount → expire it so it can't be paid any more.
          if (previous.status === 'open') {
            await stripe.checkout.sessions.expire(previousId).catch((err) => {
              console.error(`stripe/checkout: could not expire stale session ${previousId}`, err);
            });
          }
        }
      } catch (err) {
        console.error(`stripe/checkout: could not retrieve session ${previousId}`, err);
      }
    }

    // 2. New session. The idempotency key ties it to (order, amount, previous
    //    session, minute) and expires_at is derived from the same minute, so two
    //    simultaneous clicks send identical requests and get the SAME session.
    const minute = Math.floor(Date.now() / 60_000);
    // One line for the exact server-side total, so what Stripe charges always
    // equals Order.totalAmount (including any priority surcharge).
    const checkout = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: session.user.email || undefined,
        client_reference_id: order.id,
        line_items: [
          {
            price_data: {
              currency,
              product_data: { name: `3D Titans order ${orderReference(order.id)}` },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        metadata: { orderId: order.id },
        expires_at: (minute + SESSION_LIFETIME_MIN) * 60,
        success_url: `${appUrl}/checkout/success?orderId=${order.id}&stripe=success`,
        cancel_url: `${appUrl}/checkout/success?orderId=${order.id}&stripe=cancel`,
      },
      { idempotencyKey: `checkout:${order.id}:${amount}:${currency}:${previousId || 'first'}:${minute}` }
    );

    const saved = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { in: ['pending', 'failed'] } },
      data: { paymentReference: checkout.id },
    });
    if (saved.count !== 1) {
      return NextResponse.json({ error: 'This order cannot be paid right now.' }, { status: 409 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (err: any) {
    console.error('stripe/checkout POST', err);
    return NextResponse.json({ error: 'Failed to start card payment' }, { status: 500 });
  }
}
