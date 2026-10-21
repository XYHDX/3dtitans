import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

function mapProduct(product: any) {
  let gallery: string[] = [];
  if (product.imageGallery) {
    try {
      gallery = JSON.parse(product.imageGallery) || [];
    } catch (e) {
      gallery = [];
    }
  }

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price),
    description: product.description || '',
    tags: product.tags ? product.tags.split(',').filter(Boolean) : [],
    imageUrl: product.imageUrl,
    imageGallery: gallery,
    imageHint: product.imageHint || undefined,
    uploaderId: product.uploaderId,
    uploaderName: product.uploaderName || product.uploader?.name || 'Unknown',
    // uploaderEmail intentionally omitted from public responses — PII leak.
    // Admin endpoints inject it explicitly when needed (see products POST).
    storeId: product.storeId || null,
    storeName: product.store?.name,
    storeSlug: product.store?.slug,
    storeAvatarUrl: product.store?.avatarUrl || null,
    rating: product.rating || 0,
    reviewCount: product.reviewCount || 0,
    has3dPreview: product.has3dPreview || false,
    createdAt: product.createdAt,
    isPrioritizedStore: !!product.uploader?.isPrioritizedStore,
    // Archived = removed from the shop; only its admin / owner can still see it.
    archivedAt: product.archivedAt || null,
  };
}

/** Legacy store priority list (before User.isPrioritizedStore existed). Read-only. */
async function getPrioritizedIds() {
  try {
    const prioritizedSetting = await prisma.siteSetting.findUnique({ where: { key: 'prioritizedStoreIds' } });
    if (!prioritizedSetting?.value) return new Set<string>();
    return new Set<string>(JSON.parse(prioritizedSetting.value));
  } catch (error) {
    console.error('Failed to read prioritizedStoreIds', error);
    return new Set<string>();
  }
}

/** Price must be a positive number with at most 2 decimals. Returns the number or null. */
function parsePrice(raw: unknown): number | null {
  const n = typeof raw === 'string' ? Number(raw.trim()) : Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 100_000_000) return null;
  return Math.round(n * 100) / 100;
}

/** Drop the ISR caches of the catalog pages (tags set by the catalog's unstable_cache). */
function revalidateProduct(id: string) {
  try {
    revalidateTag('products');
    revalidateTag(`product:${id}`);
  } catch (err) {
    console.error('revalidateTag failed', err);
  }
}

function canManage(user: any, product: { uploaderId: string }) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'store-owner' && product.uploaderId === user.id) return true;
  return false;
}

const productInclude = {
  // Public response — no email field, that's PII for the uploader.
  uploader: { select: { id: true, name: true, isPrioritizedStore: true } },
  store: { select: { id: true, name: true, slug: true, avatarUrl: true } },
} as const;

/** GET /api/products/[id] — archived products are 404 except for their admin / owner. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (product.archivedAt) {
      const session = await getServerSession(authOptions);
      if (!canManage(session?.user, product)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const prioritizedIds = await getPrioritizedIds();
    const mapped = mapProduct(product);
    mapped.isPrioritizedStore = mapped.isPrioritizedStore || prioritizedIds.has(product.uploaderId);
    return NextResponse.json({ product: mapped });
  } catch (error) {
    console.error('Product GET failed', error);
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 });
  }
}

/**
 * PATCH /api/products/[id] — edit (admin / owning store owner).
 * `{ archived: true | false }` archives or restores the product.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || !canManage(user, existing)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, category, price, description, tags, imageUrl, imageHint, has3dPreview, imageGallery, archived } = body || {};
    const { storeId } = (body || {}) as { storeId?: string | null };

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) {
      const validPrice = parsePrice(price);
      if (validPrice === null) return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
      updateData.price = validPrice;
    }
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.join(',') : tags;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (imageHint !== undefined) updateData.imageHint = imageHint;
    if (has3dPreview !== undefined) updateData.has3dPreview = has3dPreview;
    if (storeId !== undefined) {
      if (storeId === null) {
        updateData.storeId = null;
      } else {
        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store) return NextResponse.json({ error: 'Invalid storeId' }, { status: 400 });
        if (user.role === 'store-owner' && store.ownerId !== user.id) {
          return NextResponse.json({ error: 'Unauthorized for this store' }, { status: 403 });
        }
        updateData.storeId = storeId;
      }
    }
    if (imageGallery !== undefined) {
      updateData.imageGallery = Array.isArray(imageGallery) ? JSON.stringify(imageGallery) : imageGallery;
    }
    if (typeof archived === 'boolean') {
      updateData.archivedAt = archived ? existing.archivedAt || new Date() : null;
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: updateData, include: productInclude });
      // An archived product can't be bought: take it out of every cart.
      if (archived === true) await tx.cartItem.deleteMany({ where: { productId: id } });
      return updated;
    });
    revalidateProduct(id);
    return NextResponse.json({ product: mapProduct(product) });
  } catch (error) {
    console.error('Product PATCH failed', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

/**
 * DELETE /api/products/[id] — archives the product (soft delete).
 *
 * Orders are NEVER touched: their lines keep the product's name, price and
 * image, totals and payments stay exactly as they were. The product disappears
 * from the shop, carts and new orders, and can be restored with
 * PATCH { archived: false }.
 */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.product.findUnique({ where: { id }, select: { id: true, uploaderId: true, archivedAt: true } });
    if (!existing || !canManage(user, existing)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { archivedAt: existing.archivedAt || new Date() } }),
      prisma.cartItem.deleteMany({ where: { productId: id } }),
    ]);
    revalidateProduct(id);
    return NextResponse.json({ ok: true, archived: true });
  } catch (err) {
    console.error('Product archive failed', err);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
