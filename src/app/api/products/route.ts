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

async function buildFilters(req: Request) {
  const url = new URL(req.url);
  const storeId = url.searchParams.get('storeId') || undefined;
  const storeSlug = url.searchParams.get('storeSlug') || undefined;
  const uploaderId = url.searchParams.get('uploaderId') || undefined;

  const where: any = {};
  if (storeId) where.storeId = storeId;
  if (uploaderId) where.uploaderId = uploaderId;

  if (storeSlug) {
    const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
    if (!store) {
      return { where: { id: { in: [] } } };
    }
    // Include products explicitly linked to the store plus any legacy products by the same owner.
    where.OR = [{ storeId: store.id }, { uploaderId: store.ownerId }];
  }

  return { where };
}

export async function GET(req: Request) {
  try {
    const prioritizedIds = await getPrioritizedIds();
    const { where } = await buildFilters(req);

    const prioritized = await prisma.product.findMany({
      where,
      orderBy: [
        { uploader: { isPrioritizedStore: 'desc' } },
        { rating: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        uploader: { select: { id: true, name: true, email: true, isPrioritizedStore: true } },
        store: { select: { id: true, name: true, slug: true, avatarUrl: true } },
      },
    });
    return NextResponse.json({
      products: prioritized.map((p) => {
        const mapped = mapProduct(p);
        return {
          ...mapped,
          isPrioritizedStore: mapped.isPrioritizedStore || prioritizedIds.has(p.uploaderId),
        };
      }),
    });
  } catch (error) {
    console.error('Products GET failed (priority ordering)', error);
    // Fallback for environments without isPrioritizedStore column.
    try {
      const prioritizedIds = await getPrioritizedIds();
      const { where } = await buildFilters(req);

      const products = await prisma.product.findMany({
        where,
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
        include: {
          uploader: { select: { id: true, name: true, email: true } },
          store: { select: { id: true, name: true, slug: true, avatarUrl: true } },
        },
      });
      return NextResponse.json({
        products: products.map((p) => {
          const mapped = mapProduct(p);
          return {
            ...mapped,
            isPrioritizedStore: mapped.isPrioritizedStore || prioritizedIds.has(p.uploaderId),
          };
        }),
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
    let { storeId } = body as { storeId?: string };

    if (!name || !category || !price || !imageUrl) {
      return NextResponse.json({ error: 'Name, category, price, and imageUrl are required' }, { status: 400 });
    }

    if (storeId) {
      const store = await prisma.store.findUnique({ where: { id: storeId } });
      if (!store) return NextResponse.json({ error: 'Invalid storeId' }, { status: 400 });
      if (user.role === 'store-owner' && store.ownerId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized for this store' }, { status: 403 });
      }
    } else if (user.role === 'store-owner') {
      const ownedStore = await prisma.store.findFirst({ where: { ownerId: user.id } });
      storeId = ownedStore?.id;
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
        storeId: storeId || null,
      },
      include: {
        uploader: { select: { id: true, name: true, email: true, isPrioritizedStore: true } },
        store: { select: { id: true, name: true, slug: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ product: mapProduct({ ...product, uploaderEmail: user.email || '' }) });
  } catch (error) {
    console.error('Products POST failed', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
