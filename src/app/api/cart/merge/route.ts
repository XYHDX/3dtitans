import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * POST /api/cart/merge — fold a guest cart into the user's server cart.
 *
 * Body: { items: [{ productId, quantity }, ...] }
 *
 * Strategy: for each guest item, take MAX(guest_qty, server_qty). This way
 * if the user already added 1 of an item server-side and the guest cart has
 * 3, we end up with 3 (not 4). Avoids confusing "why did my cart double?"
 * after login.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const items: Array<{ productId: string; quantity: number }> = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ ok: true, merged: 0 });
    }

    // Filter to valid productIds present in the DB
    const productIds = items.map((it) => String(it.productId)).filter(Boolean);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const validSet = new Set(existingProducts.map((p) => p.id));

    let merged = 0;
    for (const it of items) {
      const productId = String(it.productId);
      const qty = Math.max(1, Math.min(99, Number(it.quantity) || 1));
      if (!validSet.has(productId)) continue;

      const existing = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId: session.user.id, productId } },
      });
      const nextQty = Math.max(existing?.quantity || 0, qty);
      await prisma.cartItem.upsert({
        where: { userId_productId: { userId: session.user.id, productId } },
        update: { quantity: nextQty },
        create: { userId: session.user.id, productId, quantity: nextQty },
      });
      merged++;
    }

    return NextResponse.json({ ok: true, merged });
  } catch (err: any) {
    console.error('cart merge', err);
    return NextResponse.json({ error: err?.message || 'Failed to merge' }, { status: 500 });
  }
}
