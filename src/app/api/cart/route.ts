import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

function mapCartRow(row: any) {
  const p = row.product || {};
  let gallery: string[] = [];
  if (p.imageGallery) {
    try { gallery = JSON.parse(p.imageGallery) || []; } catch {}
  }
  return {
    productId: row.productId,
    quantity: row.quantity,
    addedAt: row.addedAt,
    // Embed the product so the hook can render without a separate fetch
    product: {
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      description: p.description || '',
      tags: p.tags ? p.tags.split(',').filter(Boolean) : [],
      imageUrl: p.imageUrl,
      imageGallery: gallery,
      imageHint: p.imageHint || undefined,
      uploaderId: p.uploaderId,
      uploaderName: p.uploaderName || p.uploader?.name || 'Unknown',
      storeId: p.storeId || null,
      storeName: p.store?.name,
      storeSlug: p.store?.slug,
      rating: p.rating || 0,
      reviewCount: p.reviewCount || 0,
      has3dPreview: p.has3dPreview || false,
      createdAt: p.createdAt,
    },
  };
}

/** GET /api/cart — list the logged-in user's cart items with embedded products */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ items: [] });
    }
    const rows = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      orderBy: { addedAt: 'desc' },
      include: {
        product: {
          include: { store: { select: { name: true, slug: true } } },
        },
      },
    });
    return NextResponse.json({ items: rows.map(mapCartRow) });
  } catch (err) {
    console.error('cart GET', err);
    return NextResponse.json({ items: [], error: 'Failed to load cart' }, { status: 500 });
  }
}

/**
 * POST /api/cart  body: { productId, quantity?, mode? }
 *   mode = "add" (default): increment existing qty by `quantity` (or 1)
 *   mode = "set": replace qty with `quantity`
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const productId = String(body.productId || '');
    const quantity = Math.max(1, Math.min(99, Number(body.quantity ?? 1) || 1));
    const mode = body.mode === 'set' ? 'set' : 'add';
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    // Verify product exists (avoid FK errors)
    const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    if (mode === 'set') {
      await prisma.cartItem.upsert({
        where: { userId_productId: { userId: session.user.id, productId } },
        update: { quantity },
        create: { userId: session.user.id, productId, quantity },
      });
    } else {
      // Add: increment if exists, else create with the given quantity
      const existing = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId: session.user.id, productId } },
      });
      const nextQty = Math.min(99, (existing?.quantity || 0) + quantity);
      await prisma.cartItem.upsert({
        where: { userId_productId: { userId: session.user.id, productId } },
        update: { quantity: nextQty },
        create: { userId: session.user.id, productId, quantity: nextQty },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('cart POST', err);
    return NextResponse.json({ error: err?.message || 'Failed to update cart' }, { status: 500 });
  }
}

/** DELETE /api/cart?productId=… — remove one item, or ?all=1 to wipe */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    if (searchParams.get('all') === '1') {
      await prisma.cartItem.deleteMany({ where: { userId: session.user.id } });
      return NextResponse.json({ ok: true });
    }
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }
    await prisma.cartItem.delete({
      where: { userId_productId: { userId: session.user.id, productId } },
    }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('cart DELETE', err);
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
