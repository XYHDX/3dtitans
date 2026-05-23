import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

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
    const { productId } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    // Toggle: try delete; if no row deleted, insert it.
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
    console.error('wishlist POST', err);
    return NextResponse.json({ error: err?.message || 'Failed to update wishlist' }, { status: 500 });
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
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }
    await prisma.wishlistItem.delete({
      where: { userId_productId: { userId: session.user.id, productId } },
    }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('wishlist DELETE', err);
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
