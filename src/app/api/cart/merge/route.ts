import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { rateLimitByKey } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** A cart never needs more lines than an order may have. */
const MAX_ITEMS = 50;

/**
 * POST /api/cart/merge — fold a guest cart into the user's server cart.
 *
 * Body: { items: [{ productId, quantity }, ...] }  (at most 50 are used)
 *
 * Strategy: for each guest item, take MAX(guest_qty, server_qty). This way
 * if the user already added 1 of an item server-side and the guest cart has
 * 3, we end up with 3 (not 4). Avoids confusing "why did my cart double?"
 * after login. Lines with an unknown / archived product or a quantity that
 * isn't a whole number from 1 to 99 are skipped.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const userId = session.user.id;
    if (!rateLimitByKey(`cart-merge:${userId}`, { windowMs: 10 * 60 * 1000, max: 20 }).ok) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const raw: unknown[] = Array.isArray(body?.items) ? body.items.slice(0, MAX_ITEMS) : [];

    // Validate + de-duplicate (highest quantity wins).
    const wanted = new Map<string, number>();
    for (const it of raw as Array<{ productId?: unknown; quantity?: unknown }>) {
      const productId = typeof it?.productId === 'string' ? it.productId.trim() : '';
      const qty = it?.quantity;
      if (productId.length < 8 || productId.length > 64) continue;
      if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 99) continue;
      wanted.set(productId, Math.max(wanted.get(productId) || 0, qty));
    }
    if (wanted.size === 0) {
      return NextResponse.json({ ok: true, merged: 0 });
    }

    const ids = Array.from(wanted.keys());
    const [products, existing] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: ids }, archivedAt: null }, select: { id: true } }),
      prisma.cartItem.findMany({ where: { userId, productId: { in: ids } }, select: { productId: true, quantity: true } }),
    ]);
    const current = new Map(existing.map((row) => [row.productId, row.quantity]));
    const valid = products.map((p) => p.id);

    await prisma.$transaction(
      valid.map((productId) => {
        const quantity = Math.min(99, Math.max(current.get(productId) || 0, wanted.get(productId)!));
        return prisma.cartItem.upsert({
          where: { userId_productId: { userId, productId } },
          update: { quantity },
          create: { userId, productId, quantity },
        });
      })
    );

    return NextResponse.json({ ok: true, merged: valid.length });
  } catch (err: any) {
    // Log the details; never send database messages to the client.
    console.error('cart merge', err);
    return NextResponse.json({ error: 'Failed to merge cart' }, { status: 500 });
  }
}
