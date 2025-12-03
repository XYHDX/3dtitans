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
    rating: product.rating || 0,
    reviewCount: product.reviewCount || 0,
    has3dPreview: product.has3dPreview || false,
    createdAt: product.createdAt,
    isPrioritizedStore: !!product.uploader?.isPrioritizedStore,
  };
}

async function canManage(user: any, product: any) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'store-owner' && product.uploaderId === user.id) return true;
  return false;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { uploader: { select: { id: true, name: true, email: true, isPrioritizedStore: true } } },
  });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ product: mapProduct(product) });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.product.findUnique({ where: { id: params.id } });
  if (!existing || !(await canManage(user, existing))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, category, price, description, tags, imageUrl, imageHint, has3dPreview, imageGallery } = body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (category !== undefined) updateData.category = category;
  if (price !== undefined) updateData.price = price;
  if (description !== undefined) updateData.description = description;
  if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.join(',') : tags;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
  if (imageHint !== undefined) updateData.imageHint = imageHint;
  if (has3dPreview !== undefined) updateData.has3dPreview = has3dPreview;
  if (imageGallery !== undefined) {
    updateData.imageGallery = Array.isArray(imageGallery) ? JSON.stringify(imageGallery) : imageGallery;
  }

  const product = await prisma.product.update({
    where: { id: params.id },
    data: updateData,
    include: { uploader: { select: { id: true, name: true, email: true, isPrioritizedStore: true } } },
  });

  return NextResponse.json({ product: mapProduct(product) });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.product.findUnique({ where: { id: params.id } });
  if (!existing || !(await canManage(user, existing))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const ordersWithProduct = await prisma.order.findMany({
    where: { items: { some: { productId: params.id } } },
    include: { items: true, assignments: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const order of ordersWithProduct) {
      const remainingItems = order.items.filter((item: any) => item.productId !== params.id);
      const removeIds = order.items.filter((item: any) => item.productId === params.id).map((i: any) => i.id);

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

    await tx.product.delete({ where: { id: params.id } });
  });

  return NextResponse.json({ ok: true });
}
