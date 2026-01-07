import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
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
    uploaderEmail: product.uploaderEmail || product.uploader?.email || '',
    storeId: product.storeId || null,
    storeName: product.store?.name,
    storeSlug: product.store?.slug,
    storeAvatarUrl: product.store?.avatarUrl || null,
    rating: product.rating || 0,
    reviewCount: product.reviewCount || 0,
    has3dPreview: product.has3dPreview || false,
    createdAt: product.createdAt,
    isPrioritizedStore: !!product.uploader?.isPrioritizedStore,
  };
}

async function ensureSiteSettingTable() {
  try {
    await prisma.siteSetting.findFirst({ select: { key: true }, take: 1 });
    return true;
  } catch (error) {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SiteSetting" (
          "key" TEXT PRIMARY KEY,
          "value" TEXT NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      return true;
    } catch (err) {
      console.error('Failed to ensure SiteSetting table', err);
      return false;
    }
  }
}

async function getPrioritizedIds() {
  const ok = await ensureSiteSettingTable();
  if (!ok) return new Set<string>();
  try {
    const prioritizedSetting = await prisma.siteSetting.findUnique({ where: { key: 'prioritizedStoreIds' } });
    if (!prioritizedSetting?.value) return new Set<string>();
    return new Set<string>(JSON.parse(prioritizedSetting.value));
  } catch (error) {
    console.error('Failed to read prioritizedStoreIds', error);
    return new Set<string>();
  }
}

async function canManage(user: any, product: any) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'store-owner' && product.uploaderId === user.id) return true;
  return false;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const prioritizedIds = await getPrioritizedIds();

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        uploader: { select: { id: true, name: true, email: true, isPrioritizedStore: true } },
        store: { select: { id: true, name: true, slug: true, avatarUrl: true } },
      },
    });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const mapped = mapProduct(product);
    mapped.isPrioritizedStore = mapped.isPrioritizedStore || prioritizedIds.has(product.uploaderId);
    return NextResponse.json({ product: mapped });
  } catch (error) {
    console.error('Product GET failed (priority include)', error);
    const fallback = await prisma.product.findUnique({
      where: { id },
      include: { uploader: { select: { id: true, name: true, email: true } }, store: { select: { id: true, name: true, slug: true, avatarUrl: true } } },
    });
    if (!fallback) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const prioritizedIds = await getPrioritizedIds();
    const mapped = mapProduct(fallback);
    mapped.isPrioritizedStore = mapped.isPrioritizedStore || prioritizedIds.has(fallback.uploaderId);
    return NextResponse.json({ product: mapped });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || !(await canManage(user, existing))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, category, price, description, tags, imageUrl, imageHint, has3dPreview, imageGallery } = body;
  const { storeId } = body as { storeId?: string };

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (category !== undefined) updateData.category = category;
  if (price !== undefined) updateData.price = price;
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

  try {
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        uploader: { select: { id: true, name: true, email: true, isPrioritizedStore: true } },
        store: { select: { id: true, name: true, slug: true, avatarUrl: true } },
      },
    });
    return NextResponse.json({ product: mapProduct(product) });
  } catch (error) {
    console.error('Product PATCH failed (priority include)', error);
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        store: { select: { id: true, name: true, slug: true, avatarUrl: true } },
      },
    });
    const prioritizedIds = await getPrioritizedIds();
    const mapped = mapProduct(product);
    mapped.isPrioritizedStore = mapped.isPrioritizedStore || prioritizedIds.has(product.uploaderId);
    return NextResponse.json({ product: mapped });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || !(await canManage(user, existing))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const ordersWithProduct = await prisma.order.findMany({
      where: { items: { some: { productId: id } } },
      include: { items: true, assignments: true },
    });

    await prisma.$transaction(async (tx) => {
      for (const order of ordersWithProduct) {
        const remainingItems = order.items.filter((item: any) => item.productId !== id);
        const removeIds = order.items.filter((item: any) => item.productId === id).map((i: any) => i.id);

        if (removeIds.length) {
          await tx.orderItem.deleteMany({ where: { id: { in: removeIds } } });
        }

        if (remainingItems.length === 0) {
          await tx.orderAssignment.deleteMany({ where: { orderId: order.id } });
          await tx.order.delete({ where: { id: order.id } });
        } else {
          const newTotal = remainingItems.reduce(
            (sum: number, item: any) => sum + Number(item.price) * item.quantity,
            0
          );
          await tx.order.update({
            where: { id: order.id },
            data: { totalAmount: new Prisma.Decimal(newTotal) },
          });
        }
      }

      await tx.product.delete({ where: { id } });
    });
  } catch (err) {
    console.error('Product delete transaction failed, attempting direct delete', err);
    try {
      await prisma.product.delete({ where: { id } });
    } catch (err2) {
      console.error('Product direct delete failed', err2);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
