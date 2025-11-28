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

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { uploader: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ products: products.map(mapProduct) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || (user.role !== 'admin' && user.role !== 'store-owner')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, category, price, description, tags, imageUrl, imageHint, has3dPreview } = body;

  if (!name || !category || !price || !imageUrl) {
    return NextResponse.json({ error: 'Name, category, price, and imageUrl are required' }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      category,
      price,
      description: description || '',
      tags: Array.isArray(tags) ? tags.join(',') : tags || '',
      imageUrl,
      imageHint: imageHint || '',
      has3dPreview: !!has3dPreview,
      uploaderId: user.id,
      uploaderName: user.name || user.email || 'Uploader',
    },
  });

  return NextResponse.json({ product: mapProduct(product) });
}
