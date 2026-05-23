import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * POST /api/payments/stripe/webhook
 *
 * Stripe → us, signed with STRIPE_WEBHOOK_SECRET. Marks the order paid
 * when `checkout.session.completed` arrives.
 *
 * Set this up in your Stripe dashboard:
 *   1. Developers → Webhooks → Add endpoint
 *   2. URL = https://3dtitans.org/api/payments/stripe/webhook
 *   3. Events = checkout.session.completed (and checkout.session.async_payment_failed)
 *   4. Copy the signing secret (whsec_…) into STRIPE_WEBHOOK_SECRET env var on Vercel
 *
 * IMPORTANT: this route must read the raw body for signature verification.
 * Next.js App Router gives us req.text() which is what we need.
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
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'paid',
            paidAt: new Date(),
            paymentReference: session.id,
          } as any,
        });
      }
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as any;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'failed' } as any,
        });
      }
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
