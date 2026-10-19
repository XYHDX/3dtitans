import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { rateLimitByKey } from '@/lib/rate-limit';
import { mapOrder } from '@/lib/orders/map';
import { getPaymentSettings } from '@/lib/payments/settings';
import { PAYMENT_METHODS, type PaymentMethodId } from '@/lib/payments/common';
import { notifyOrderPlaced } from '@/lib/email';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const orderSelect = {
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  totalAmount: true,
  status: true,
  shippingName: true,
  shippingAddress1: true,
  shippingCity: true,
  shippingPostalCode: true,
  shippingCountry: true,
  phoneNumber: true,
  customerEmail: true,
  notes: true,
  predictedFinishAt: true,
  isPrioritized: true,
  paymentMethod: true,
  paymentStatus: true,
  paymentReference: true,
  paymentProofUrl: true,
  paidAt: true,
  items: { select: { productId: true, name: true, quantity: true, price: true, imageUrl: true } },
  assignments: { select: { ownerId: true, ownerEmail: true } },
} as const;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Auto-pool orders older than 24h that are still awaiting acceptance and assigned.
    // Restrict to admin view to avoid side-effects on every store-owner request.
    if (user.role === 'admin') {
      try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const stale = await prisma.order.findMany({
          where: { status: 'AwaitingAcceptance', createdAt: { lt: cutoff }, assignments: { some: {} } },
          select: { id: true },
        });
        if (stale.length) {
          const staleIds = stale.map((o) => o.id);
          await prisma.$transaction([
            prisma.orderAssignment.deleteMany({ where: { orderId: { in: staleIds } } }),
            prisma.order.updateMany({ where: { id: { in: staleIds } }, data: { status: 'Pooled' } }),
          ]);
        }
      } catch (error) {
        console.error('Orders auto-pool step failed', error);
        // Do not block the response on this maintenance task.
      }
    }

    // NOTE: there is deliberately no "fetch everything" fallback here — on any
    // error we return 500 rather than risk showing one user another's orders.
    if (user.role === 'admin') {
      const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, select: orderSelect });
      return NextResponse.json({ orders: orders.map((o) => mapOrder(o, 'admin')) });
    }

    if (user.role === 'store-owner') {
      const orders = await prisma.order.findMany({
        where: {
          OR: [
            { assignments: { some: { ownerId: user.id } } },
            ...(user.email ? [{ assignments: { some: { ownerEmail: user.email } } }] : []),
            { status: 'Pooled' },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: orderSelect,
      });
      return NextResponse.json({ orders: orders.map((o) => mapOrder(o, 'owner')) });
    }

    const userEmail = (user.email || '').toLowerCase();
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: user.id },
          // Legacy orders placed before accounts were linked to orders.
          ...(userEmail ? [{ userId: null, customerEmail: { equals: userEmail, mode: 'insensitive' as const } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: orderSelect,
    });
    return NextResponse.json({ orders: orders.map((o) => mapOrder(o, 'customer')) });
  } catch (error: any) {
    // Don't leak Prisma error codes or messages to the client — those can
    // hint at schema layout. Log the real error, return a generic message.
    console.error('Orders GET failed', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id) return NextResponse.json({ error: 'Please log in to place an order.' }, { status: 401 });
    if (user.role === 'store-owner') return NextResponse.json({ error: 'Store owners cannot place orders' }, { status: 403 });

    if (!rateLimitByKey(`orders:${user.id}`, { windowMs: 10 * 60 * 1000, max: 20 }).ok) {
      return NextResponse.json({ error: 'Too many orders in a short time. Please wait a few minutes.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    // Client sends ONLY {productId, quantity} per item + idempotencyKey + shipping
    // info. Everything else (price, name, image, total, assignees) is server-derived
    // from the database. Never trust the client with prices.
    const { items, shippingAddress, phoneNumber, notes, paymentMethod, idempotencyKey } = body || {};

    // -------------------------------------------------------------------
    // 1. IDEMPOTENCY KEY — strictly required (prevents duplicate orders from
    //    double-clicks and network retries).
    // -------------------------------------------------------------------
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return NextResponse.json(
        { error: 'Missing or invalid idempotency key. Refresh the checkout page and try again.' },
        { status: 400 }
      );
    }

    const existing = await prisma.order.findUnique({
      where: { idempotencyKey },
      select: orderSelect,
    });
    if (existing) {
      // Only the original placer can claim the duplicate — never leak someone else's order.
      if (existing.userId === user.id) {
        return NextResponse.json({ order: mapOrder(existing, 'customer') });
      }
      return NextResponse.json({ error: 'Idempotency key conflict' }, { status: 409 });
    }

    // -------------------------------------------------------------------
    // 2. Payment method — must be one the store currently accepts AND has
    //    configured (e.g. Sham Cash needs a wallet number).
    // -------------------------------------------------------------------
    const paymentSettings = await getPaymentSettings();
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Please choose a payment method.' }, { status: 400 });
    }
    if (!paymentSettings.available[paymentMethod as PaymentMethodId]) {
      return NextResponse.json({ error: 'This payment method is not available right now.' }, { status: 400 });
    }

    // -------------------------------------------------------------------
    // 3. Shipping / contact validation
    // -------------------------------------------------------------------
    const ship = {
      fullName: str(shippingAddress?.fullName, 120),
      addressLine1: str(shippingAddress?.addressLine1, 300),
      city: str(shippingAddress?.city, 100),
      postalCode: str(shippingAddress?.postalCode, 20),
      country: str(shippingAddress?.country, 100),
    };
    if (!ship.fullName || !ship.addressLine1 || !ship.city || !ship.postalCode || !ship.country) {
      return NextResponse.json({ error: 'Shipping address is incomplete' }, { status: 400 });
    }
    // Accept Arabic-Indic / Persian digits too (٠٩٣… → 093…).
    const phone = str(phoneNumber, 30).replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) =>
      String(d.charCodeAt(0) & 0xf)
    );
    if (!/^\+?[0-9\s\-()]{7,30}$/.test(phone)) {
      return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
    }
    const cleanNotes = str(notes, 500);

    // -------------------------------------------------------------------
    // 4. AUTHORITATIVE PRICING — fetch every product from the database and
    //    ignore any price/name/image sent by the client.
    // -------------------------------------------------------------------
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }
    // Merge duplicate lines for the same product and clamp quantities.
    const qtyById = new Map<string, number>();
    for (const it of items) {
      const id = String(it?.productId || '');
      if (!id) continue;
      const raw = Number(it?.quantity);
      const q = Number.isFinite(raw) ? Math.floor(raw) : 1;
      qtyById.set(id, Math.min(99, (qtyById.get(id) || 0) + Math.max(1, q)));
    }
    const requestedIds = Array.from(qtyById.keys());
    if (requestedIds.length === 0) {
      return NextResponse.json({ error: 'No valid product IDs in cart' }, { status: 400 });
    }

    const dbProducts = await prisma.product.findMany({
      where: { id: { in: requestedIds } },
      select: { id: true, name: true, price: true, imageUrl: true, uploaderId: true },
    });
    const productById = new Map(dbProducts.map((p) => [p.id, p]));
    const missingIds = requestedIds.filter((id) => !productById.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: 'Some items in your cart are no longer available', missingIds },
        { status: 400 }
      );
    }

    const lineItems = requestedIds.map((id) => {
      const product = productById.get(id)!;
      return {
        productId: product.id,
        name: product.name,
        quantity: qtyById.get(id)!,
        price: Number(product.price),
        imageUrl: product.imageUrl || '',
      };
    });
    if (lineItems.some((it) => !Number.isFinite(it.price) || it.price <= 0)) {
      return NextResponse.json({ error: 'An item in your cart has an invalid price. Please contact support.' }, { status: 400 });
    }

    // Server computes the total (rounded to cents) — client never sends one.
    const computedTotal = Math.round(lineItems.reduce((sum, it) => sum + it.price * it.quantity, 0) * 100) / 100;
    if (!Number.isFinite(computedTotal) || computedTotal <= 0) {
      return NextResponse.json({ error: 'Computed order total is invalid' }, { status: 400 });
    }

    // -------------------------------------------------------------------
    // 5. Assignees — derived from the SAME product set we just validated.
    // -------------------------------------------------------------------
    const assignees = Array.from(
      new Set(dbProducts.map((p) => p.uploaderId).filter((id): id is string => !!id && id.trim().length > 0))
    );
    if (!assignees.length) {
      return NextResponse.json(
        { error: 'Order cannot be created because products are missing uploader assignments.' },
        { status: 400 }
      );
    }

    const orderData = {
      userId: user.id,
      status: 'AwaitingAcceptance',
      totalAmount: computedTotal,
      shippingName: ship.fullName,
      shippingAddress1: ship.addressLine1,
      shippingCity: ship.city,
      shippingPostalCode: ship.postalCode,
      shippingCountry: ship.country,
      phoneNumber: phone,
      // Always the account's own email: order emails and access checks key off it,
      // so it must not be something the client can set to a stranger's address.
      customerEmail: (user.email || '').toLowerCase() || null,
      isPrioritized: false,
      notes: cleanNotes,
      paymentMethod,
      paymentStatus: 'pending',
      idempotencyKey,
      items: { create: lineItems },
      assignments: { create: assignees.map((ownerId) => ({ ownerId })) },
    };

    let order;
    try {
      order = await prisma.order.create({ data: orderData, select: orderSelect });
    } catch (error: any) {
      // Idempotency race: two simultaneous POSTs with the same key. The DB's
      // unique constraint rejects the loser with P2002 — return the winner.
      if (error?.code === 'P2002') {
        const winner = await prisma.order.findUnique({ where: { idempotencyKey }, select: orderSelect });
        if (winner && winner.userId === user.id) return NextResponse.json({ order: mapOrder(winner, 'customer') });
      }
      throw error;
    }

    await notifyOrderPlaced(order, paymentSettings.currency);

    return NextResponse.json({ order: mapOrder(order, 'customer') });
  } catch (error: any) {
    // Log the full error server-side, return a generic message to the client.
    console.error('Orders POST failed', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
