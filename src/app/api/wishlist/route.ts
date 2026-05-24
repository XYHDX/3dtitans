import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * Validates that an arbitrary value from a request body is a usable productId.
 * Returns the trimmed string if OK, or null if it's anything we don't trust.
 */
function sanitizeProductId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  // cuid()s are around 25 chars; uuid v4 is 36; accept anything in a sane range
  if (trimmed.length < 8 || trimmed.length > 64) return null;
  return trimmed;
}

/** GET /api/wishlist — returns the current user's wishlisted products */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ items: [] });
    }
    const items = await prisma.wishlistItem.findMany({
      where: { userId: session.user.id },
      orderBy: { addedAt: 'desc' },
      include: {
        product: {
          include: { store: { select: { name: true, slug: true } } },
        },
      },
    });
    const products = items.map((it: any) => ({
      id: it.product.id,
      name: it.product.name,
      category: it.product.category,
      price: Number(it.product.price),
      description: it.product.description || '',
      tags: it.product.tags ? it.product.tags.split(',').filter(Boolean) : [],
      imageUrl: it.product.imageUrl,
      imageHint: it.product.imageHint || undefined,
      uploaderId: it.product.uploaderId,
      uploaderName: it.product.uploaderName || 'Unknown',
      storeId: it.product.storeId || null,
      storeName: it.product.store?.name,
      storeSlug: it.product.store?.slug,
      rating: it.product.rating || 0,
      reviewCount: it.product.reviewCount || 0,
      has3dPreview: it.product.has3dPreview || false,
      createdAt: it.product.createdAt,
      addedAt: it.addedAt,
    }));
    return NextResponse.json({ items: products });
  } catch (err) {
    console.error('wishlist GET', err);
    return NextResponse.json({ items: [], error: 'Failed to load wishlist' }, { status: 500 });
  }
}

/** POST /api/wishlist  { productId }  — toggle wishlist (add or remove) */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const productId = sanitizeProductId(body?.productId);
    if (!productId) {
      return NextResponse.json(
        { error: 'productId must be a non-empty string between 8 and 64 characters' },
        { status: 400 }
      );
    }

    // Verify the product actually exists before we attempt any FK-bound write.
    // Without this, a manipulated productId would hit Prisma's foreign-key
    // constraint and bubble up as a 500 instead of the proper 400/404.
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Toggle: try delete; if no row existed, insert.
    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: session.user.id, productId } },
    });
    if (existing) {
      await prisma.wishlistItem.delete({
        where: { userId_productId: { userId: session.user.id, productId } },
      });
      return NextResponse.json({ wishlisted: false });
    }
    await prisma.wishlistItem.create({
      data: { userId: session.user.id, productId },
    });
    return NextResponse.json({ wishlisted: true });
  } catch (err: any) {
    // FK violation (P2003) shouldn't happen now because we pre-verify the product,
    // but defensively map it to 404 if it ever fires (e.g. product deleted in a race).
    if (err?.code === 'P2003') {
      return NextResponse.json({ error: 'Product no longer exists' }, { status: 404 });
    }
    console.error('wishlist POST', err);
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 });
  }
}

/** DELETE /api/wishlist?productId=… — explicit remove (used by /wishlist page) */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const productId = sanitizeProductId(searchParams.get('productId'));
    if (!productId) {
      return NextResponse.json(
        { error: 'productId must be a non-empty string between 8 and 64 characters' },
        { status: 400 }
      );
    }
    // Idempotent — remove if it exists, no error if not. We don't need to
    // verify the product exists; removing a stale wishlist row is fine.
    await prisma.wishlistItem
      .delete({ where: { userId_productId: { userId: session.user.id, productId } } })
      .catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('wishlist DELETE', err);
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
