import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { rateLimitByKey } from '@/lib/rate-limit';
import { mapOrder } from '@/lib/orders/map';
import { verifiedEmailOf } from '@/lib/orders/access';
import { isOrderStatus } from '@/lib/orders/transitions';
import { getPaymentSettings } from '@/lib/payments/settings';
import { normalizePaymentReference } from '@/lib/payments/reference';
import { MANUAL_PAYMENT_METHODS, PAYMENT_METHODS, orderReference, type PaymentMethodId } from '@/lib/payments/common';
import { notifyOrderPlaced } from '@/lib/email';
import type { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

const orderSelect = {
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  totalAmount: true,
  currency: true,
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

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

/** Lists are paged (newest first). Callers that don't ask get the newest 100. */
const MAX_PAGE = 100;
const PAYMENT_STATUSES = ['pending', 'verifying', 'paid', 'failed', 'refunded'];

/**
 * Admin-only: for manual payments, which OTHER orders carry the same transfer
 * reference (after normalising digits / spaces / case)? The admin page shows a
 * warning so one transfer is never approved for two orders.
 */
async function referenceDuplicates(rows: OrderRow[]): Promise<Map<string, { reference: string; paymentStatus: string }[]>> {
  const result = new Map<string, { reference: string; paymentStatus: string }[]>();
  const manual = rows.filter(
    (o) => MANUAL_PAYMENT_METHODS.includes(o.paymentMethod as PaymentMethodId) && normalizePaymentReference(o.paymentReference)
  );
  if (!manual.length) return result;
  const wanted = new Set(manual.map((o) => normalizePaymentReference(o.paymentReference)));

  const [others, recorded] = await Promise.all([
    prisma.order.findMany({
      where: { paymentMethod: { in: MANUAL_PAYMENT_METHODS }, paymentReference: { not: null } },
      select: { id: true, paymentReference: true, paymentStatus: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }),
    prisma.paymentTransaction.findMany({
      where: { provider: { in: MANUAL_PAYMENT_METHODS }, externalId: { in: Array.from(wanted) } },
      select: { externalId: true, order: { select: { id: true, paymentStatus: true } } },
    }),
  ]);

  const byRef = new Map<string, Map<string, string>>();
  const add = (ref: string, id: string, status: string) => {
    if (!wanted.has(ref)) return;
    if (!byRef.has(ref)) byRef.set(ref, new Map());
    byRef.get(ref)!.set(id, status);
  };
  others.forEach((o) => add(normalizePaymentReference(o.paymentReference), o.id, o.paymentStatus));
  recorded.forEach((t) => add(t.externalId, t.order.id, t.order.paymentStatus));

  for (const o of manual) {
    const matches = byRef.get(normalizePaymentReference(o.paymentReference));
    const dupes = matches
      ? Array.from(matches.entries())
          .filter(([id]) => id !== o.id)
          .map(([id, paymentStatus]) => ({ reference: orderReference(id), paymentStatus }))
      : [];
    if (dupes.length) result.set(o.id, dupes);
  }
  return result;
}

/**
 * GET /api/orders?limit=&cursor=&status=A,B&paymentStatus=&scope=assigned|pool
 *
 *  - admin:       every order
 *  - store owner: orders assigned to them (full details) + the shared pool
 *                 (items, city and total only until claimed). scope narrows it.
 *  - customer:    their own orders
 * Response: { orders, nextCursor } — pass nextCursor back as `cursor` for the next page.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = new URL(req.url).searchParams;
    const limit = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(params.get('limit') || '', 10) || MAX_PAGE));
    const cursor = (params.get('cursor') || '').trim();
    if (cursor.length > 64) return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
    const statuses = (params.get('status') || '').split(',').map((s) => s.trim()).filter(isOrderStatus);
    const paymentStatus = params.get('paymentStatus') || '';
    const scope = params.get('scope') || '';

    // NOTE: there is deliberately no "fetch everything" fallback here — on any
    // error we return 500 rather than risk showing one user another's orders.
    const filters: Prisma.OrderWhereInput[] = [];
    let viewerOf: (o: OrderRow) => 'admin' | 'owner' | 'pool' | 'customer';

    if (user.role === 'admin') {
      viewerOf = () => 'admin';
    } else if (user.role === 'store-owner') {
      const ownerEmail = user.email || '';
      const mine: Prisma.OrderWhereInput = {
        OR: [
          { assignments: { some: { ownerId: user.id } } },
          ...(ownerEmail ? [{ assignments: { some: { ownerEmail } } }] : []),
        ],
      };
      const pool: Prisma.OrderWhereInput = { status: 'Pooled' };
      filters.push(scope === 'assigned' ? mine : scope === 'pool' ? pool : { OR: [mine, pool] });
      const isMine = (o: OrderRow) =>
        o.assignments.some((a) => a.ownerId === user.id || (!!ownerEmail && a.ownerEmail === ownerEmail));
      viewerOf = (o) => (isMine(o) ? 'owner' : 'pool');
    } else {
      // Legacy orders without an account link match by email only when the
      // email is verified (no order takeover by registering someone's address).
      const email = await verifiedEmailOf(user.id);
      filters.push({
        OR: [
          { userId: user.id },
          ...(email ? [{ userId: null, customerEmail: { equals: email, mode: 'insensitive' as const } }] : []),
        ],
      });
      viewerOf = () => 'customer';
    }
    if (statuses.length) filters.push({ status: { in: statuses } });
    if (PAYMENT_STATUSES.includes(paymentStatus)) filters.push({ paymentStatus });

    const rows = await prisma.order.findMany({
      where: filters.length ? { AND: filters } : {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: orderSelect,
    });
    const page = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? page[page.length - 1]?.id ?? null : null;

    const orders = page.map((o) => mapOrder(o, viewerOf(o)));
    if (user.role === 'admin') {
      const dupes = await referenceDuplicates(page);
      orders.forEach((o) => {
        o.referenceUsedOnOtherOrders = dupes.get(o.id) || [];
      });
    }
    return NextResponse.json({ orders, nextCursor });
  } catch (error: any) {
    // Don't leak Prisma error codes or messages to the client — those can
    // hint at schema layout. Log the real error, return a generic message.
    console.error('Orders GET failed', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Campaign attribution from the `3dt_utm` cookie (set by captureUtm in src/lib/analytics.ts). */
function readUtm(req: Request): { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null } {
  const none = { utmSource: null, utmMedium: null, utmCampaign: null };
  const raw = (req.headers.get('cookie') || '')
    .split(/;\s*/)
    .find((c) => c.startsWith('3dt_utm='))
    ?.slice('3dt_utm='.length);
  if (!raw) return none;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    const pick = (k: string) => (typeof parsed?.[k] === 'string' ? parsed[k].trim().slice(0, 100) || null : null);
    return { utmSource: pick('utm_source'), utmMedium: pick('utm_medium'), utmCampaign: pick('utm_campaign') };
  } catch {
    return none;
  }
}

/** Stable fingerprint of a cart: "productId:qty" lines, sorted. */
function cartSignature(lines: Array<[string | null, number]>): string {
  const text = lines
    .map(([id, q]) => `${id || ''}:${q}`)
    .sort()
    .join(',');
  return createHash('sha256').update(text).digest('hex');
}

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

    // -------------------------------------------------------------------
    // 2. CART — whole quantities 1..99 per product, at most 50 products.
    //    Invalid quantities are rejected, never silently changed.
    // -------------------------------------------------------------------
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: 'Your cart must have between 1 and 50 items.', code: 'invalid_cart' }, { status: 400 });
    }
    const qtyById = new Map<string, number>();
    for (const it of items) {
      const id = typeof it?.productId === 'string' ? it.productId.trim() : '';
      if (!id || id.length > 64) {
        return NextResponse.json(
          { error: 'An item in your cart is invalid. Please refresh your cart and try again.', code: 'invalid_cart' },
          { status: 400 }
        );
      }
      const raw = typeof it?.quantity === 'string' && it.quantity.trim() !== '' ? Number(it.quantity) : it?.quantity;
      const total = (qtyById.get(id) || 0) + (typeof raw === 'number' ? raw : NaN);
      if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || total > 99) {
        return NextResponse.json(
          { error: 'Each quantity must be a whole number from 1 to 99.', code: 'invalid_quantity' },
          { status: 400 }
        );
      }
      qtyById.set(id, total);
    }
    const requestedIds = Array.from(qtyById.keys());
    const requestedSignature = cartSignature(Array.from(qtyById.entries()));

    // Same key again → same order, but only for the same person AND the same
    // cart (a reused key with a different cart is a client bug, not a retry).
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey },
      select: orderSelect,
    });
    if (existing) {
      // Only the original placer can claim the duplicate — never leak someone else's order.
      if (existing.userId !== user.id) {
        return NextResponse.json({ error: 'Idempotency key conflict' }, { status: 409 });
      }
      if (cartSignature(existing.items.map((i) => [i.productId, i.quantity])) !== requestedSignature) {
        return NextResponse.json(
          {
            error: 'This checkout was already submitted with a different cart. Refresh the page and try again.',
            code: 'idempotency_cart_mismatch',
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ order: mapOrder(existing, 'customer') });
    }

    // -------------------------------------------------------------------
    // 3. Payment method — must be one the store currently accepts AND has
    //    configured (e.g. Sham Cash needs a wallet number; card payment
    //    needs a currency Stripe supports).
    // -------------------------------------------------------------------
    const paymentSettings = await getPaymentSettings();
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Please choose a payment method.' }, { status: 400 });
    }
    if (!paymentSettings.available[paymentMethod as PaymentMethodId]) {
      return NextResponse.json({ error: 'This payment method is not available right now.' }, { status: 400 });
    }

    // -------------------------------------------------------------------
    // 4. Shipping / contact validation (postal code optional; most Syrian
    //    addresses have none).
    // -------------------------------------------------------------------
    const ship = {
      fullName: str(shippingAddress?.fullName, 120),
      addressLine1: str(shippingAddress?.addressLine1, 300),
      city: str(shippingAddress?.city, 100),
      postalCode: str(shippingAddress?.postalCode, 20),
      country: str(shippingAddress?.country, 100) || 'Syria',
    };
    if (!ship.fullName || !ship.addressLine1 || !ship.city) {
      return NextResponse.json({ error: 'Shipping address is incomplete' }, { status: 400 });
    }
    // Accept Arabic-Indic / Persian digits too (٠٩٣… → 093…).
    const phone = str(phoneNumber, 30).replace(/[٠-٩۰-۹]/g, (d) =>
      String(d.charCodeAt(0) & 0xf)
    );
    if (!/^\+?[0-9\s\-()]{7,30}$/.test(phone)) {
      return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
    }
    const cleanNotes = str(notes, 500);

    // -------------------------------------------------------------------
    // 5. AUTHORITATIVE PRICING — fetch every product from the database and
    //    ignore any price/name/image sent by the client. Archived (removed)
    //    products can't be ordered.
    // -------------------------------------------------------------------
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: requestedIds } },
      select: { id: true, name: true, price: true, imageUrl: true, uploaderId: true, archivedAt: true },
    });
    const productById = new Map(dbProducts.filter((p) => !p.archivedAt).map((p) => [p.id, p]));
    const unavailableIds = requestedIds.filter((id) => !productById.has(id));
    if (unavailableIds.length > 0) {
      const names = dbProducts.filter((p) => p.archivedAt).map((p) => p.name);
      return NextResponse.json(
        {
          error: names.length
            ? `No longer available: ${names.join(', ')}. Remove ${names.length === 1 ? 'it' : 'them'} from your cart and try again.`
            : 'Some items in your cart are no longer available. Remove them from your cart and try again.',
          code: 'product_unavailable',
          missingIds: unavailableIds,
        },
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
    // 6. Assignees — derived from the SAME product set we just validated.
    // -------------------------------------------------------------------
    const assignees = Array.from(
      new Set(Array.from(productById.values()).map((p) => p.uploaderId).filter((id): id is string => !!id && id.trim().length > 0))
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
      // Fixed at creation: a later change of the store currency never relabels this order.
      currency: paymentSettings.currency,
      shippingName: ship.fullName,
      shippingAddress1: ship.addressLine1,
      shippingCity: ship.city,
      shippingPostalCode: ship.postalCode || null,
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
      ...readUtm(req),
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
        if (
          winner &&
          winner.userId === user.id &&
          cartSignature(winner.items.map((i) => [i.productId, i.quantity])) === requestedSignature
        ) {
          return NextResponse.json({ order: mapOrder(winner, 'customer') });
        }
        return NextResponse.json({ error: 'Idempotency key conflict' }, { status: 409 });
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
