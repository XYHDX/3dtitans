import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { orderReference } from '@/lib/payments/common';
import { getPaymentSettings } from '@/lib/payments/settings';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/stripe/checkout  body: { orderId }
 *
 * Creates a Stripe Checkout Session for the order's server-side total and
 * returns its hosted-checkout URL. The webhook marks the order paid.
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
    const { orderId } = await req.json().catch(() => ({}));
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const settings = await getPaymentSettings();
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || !settings.available.stripe) {
      return NextResponse.json({ error: 'Card payment is not available right now.' }, { status: 503 });
    }
    const currency = settings.currency.toLowerCase();
    if (currency === 'syp') {
      return NextResponse.json({ error: 'Card payments are not available in SYP.' }, { status: 503 });
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

    const amount = Math.round(Number(order.totalAmount) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    // Dynamic import so the bundle doesn't carry stripe if it isn't used
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, { apiVersion: '2024-10-28.acacia' as any });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://3dtitans.org';

    // One line for the exact server-side total, so what Stripe charges always
    // equals Order.totalAmount (including any priority surcharge).
    const checkout = await stripe.checkout.sessions.create({
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
      success_url: `${appUrl}/checkout/success?orderId=${order.id}&stripe=success`,
      cancel_url: `${appUrl}/checkout/success?orderId=${order.id}&stripe=cancel`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentReference: checkout.id },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err: any) {
    console.error('stripe/checkout POST', err);
    return NextResponse.json({ error: 'Failed to start card payment' }, { status: 500 });
  }
}
