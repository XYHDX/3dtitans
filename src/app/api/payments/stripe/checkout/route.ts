import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * POST /api/payments/stripe/checkout  body: { orderId }
 *
 * Creates a Stripe Checkout Session for the given order and returns its
 * hosted-checkout URL. The webhook at /api/payments/stripe/webhook will
 * mark the order paid once Stripe confirms.
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
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to your Vercel env vars.' },
        { status: 503 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Dynamic import so the bundle doesn't carry stripe if it isn't used
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, { apiVersion: '2024-10-28.acacia' as any });

    // Get currency from settings (defaults to USD if not set)
    const currencySetting = await prisma.siteSetting.findUnique({
      where: { key: 'payment.currencyLabel' },
    });
    const currency = (currencySetting?.value || 'usd').toLowerCase();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://3dtitans.org';

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: session.user.email || undefined,
      line_items: order.items.map((item) => ({
        price_data: {
          currency,
          product_data: { name: item.name, images: item.imageUrl ? [item.imageUrl] : undefined },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: item.quantity,
      })),
      metadata: { orderId: order.id },
      success_url: `${appUrl}/checkout/success?orderId=${order.id}&stripe=success`,
      cancel_url: `${appUrl}/checkout/success?orderId=${order.id}&stripe=cancel`,
    });

    // Record the Stripe session ID so the webhook can match it up
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentReference: checkout.id } as any,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err: any) {
    console.error('stripe/checkout POST', err);
    return NextResponse.json({ error: err?.message || 'Failed to create checkout' }, { status: 500 });
  }
}
