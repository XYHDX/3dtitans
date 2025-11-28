import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

function mapProduct(product: any) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price),
    description: product.description || '',
    tags: product.tags ? product.tags.split(',').filter(Boolean) : [],
    imageUrl: product.imageUrl,
    imageHint: product.imageHint || undefined,
    uploaderId: product.uploaderId,
    uploaderName: product.uploaderName || product.uploader?.name || 'Unknown',
    rating: product.rating || 0,
    reviewCount: product.reviewCount || 0,
    has3dPreview: product.has3dPreview || false,
    createdAt: product.createdAt,
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
    include: { uploader: { select: { id: true, name: true } } },
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
  const { name, category, price, description, tags, imageUrl, imageHint, has3dPreview } = body;

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      name,
      category,
      price,
      description,
      tags: Array.isArray(tags) ? tags.join(',') : tags,
      imageUrl,
      imageHint,
      has3dPreview,
    },
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

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
