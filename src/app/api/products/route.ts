import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
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

export async function GET() {
  try {
    const prioritizedSetting = await prisma.siteSetting.findUnique({ where: { key: 'prioritizedStoreIds' } });
    const prioritizedIds = (() => {
      if (!prioritizedSetting?.value) return new Set<string>();
      try {
        return new Set<string>(JSON.parse(prioritizedSetting.value));
      } catch {
        return new Set<string>();
      }
    })();

    const prioritized = await prisma.product.findMany({
      orderBy: [
        { uploader: { isPrioritizedStore: 'desc' } },
        { rating: 'desc' },
        { createdAt: 'desc' },
      ],
      include: { uploader: { select: { id: true, name: true, email: true, isPrioritizedStore: true } } },
    });
    return NextResponse.json({
      products: prioritized.map((p) => ({
        ...mapProduct(p),
        isPrioritizedStore: mapProduct(p).isPrioritizedStore || prioritizedIds.has(p.uploaderId),
      })),
    });
  } catch (error) {
    console.error('Products GET failed (priority ordering)', error);
    // Fallback for environments without isPrioritizedStore column.
    try {
      const prioritizedSetting = await prisma.siteSetting.findUnique({ where: { key: 'prioritizedStoreIds' } });
      const prioritizedIds = (() => {
        if (!prioritizedSetting?.value) return new Set<string>();
        try {
          return new Set<string>(JSON.parse(prioritizedSetting.value));
        } catch {
          return new Set<string>();
        }
      })();

      const products = await prisma.product.findMany({
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
        include: { uploader: { select: { id: true, name: true, email: true } } },
      });
      return NextResponse.json({
        products: products.map((p) => ({
          ...mapProduct(p),
          isPrioritizedStore: mapProduct(p).isPrioritizedStore || prioritizedIds.has(p.uploaderId),
        })),
      });
    } catch (err) {
      console.error('Products GET fallback failed', err);
      return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
    }
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || (user.role !== 'admin' && user.role !== 'store-owner')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, category, price, description, tags, imageUrl, imageHint, has3dPreview, imageGallery } = body;

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
        imageGallery: Array.isArray(imageGallery) ? JSON.stringify(imageGallery) : JSON.stringify([imageUrl]),
        uploaderId: user.id,
        uploaderName: user.name || user.email || 'Uploader',
      },
    });

    return NextResponse.json({ product: mapProduct({ ...product, uploaderEmail: user.email || '' }) });
  } catch (error) {
    console.error('Products POST failed', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
