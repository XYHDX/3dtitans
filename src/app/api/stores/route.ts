import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { Prisma } from '@prisma/client';
import { PRIVATE_CACHE_CONTROL, PUBLIC_CACHE_CONTROL } from '@/app/products/_lib/http-cache';

// API routes depend on the request (query string / session cookies) and must
// never be pre-rendered at build time. CDN caching is set per response below.
export const dynamic = 'force-dynamic';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function mapStore(store: any, extraProductsCount?: number) {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    bio: store.bio || '',
    avatarUrl: store.avatarUrl || null,
    coverUrl: store.coverUrl || null,
    websiteUrl: store.websiteUrl || null,
    ownerId: store.ownerId,
    isPublished: !!store.isPublished,
    sortOrder: typeof store.sortOrder === 'number' ? store.sortOrder : 0,
    productsCount: extraProductsCount ?? store._count?.products ?? undefined,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
}

/** The public directory is small; the cap only guards against runaway responses. */
const MAX_STORES = 200;

/**
 * GET /api/stores
 *
 * Public: published stores only, cached on the CDN.
 * `?published=false` (include drafts) is honoured only for admins (any store)
 * and store owners (their own store) — everyone else gets the published list.
 * Responses to that variant depend on the session, so they are never cached.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wantsDrafts = searchParams.get('published') === 'false';
    let ownerId = searchParams.get('ownerId');
    let includeDrafts = false;

    if (wantsDrafts) {
      const session = await getServerSession(authOptions);
      const user = session?.user;
      if (user?.role === 'admin') {
        includeDrafts = true;
      } else if (user?.role === 'store-owner' && user.id) {
        // Owners may only see their own draft store.
        includeDrafts = true;
        ownerId = user.id;
      }
    }
    const cacheControl = wantsDrafts ? PRIVATE_CACHE_CONTROL : PUBLIC_CACHE_CONTROL;

    const where: Prisma.StoreWhereInput = {};
    if (ownerId) {
      where.ownerId = ownerId;
    } else {
      // Filter out legacy bad rows with null/empty ownerId or slug using string comparisons.
      where.ownerId = { gt: '' };
      where.slug = { gt: '' };
    }
    if (!includeDrafts) where.isPublished = true;

    const stores = await prisma.store.findMany({
      where,
      orderBy: [{ isPublished: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: MAX_STORES,
    });

    const storeIds = stores.map((s) => s.id);
    const ownerIds = stores.map((s) => s.ownerId);

    // A store's products = linked to the store OR legacy products by its owner
    // (counted once). Archived products are hidden from the shop, so not counted.
    const [storeCounts, ownerCounts, intersectionCounts] = await Promise.all([
      prisma.product.groupBy({
        by: ['storeId'],
        where: { archivedAt: null, storeId: { in: storeIds } },
        _count: true,
      }),
      prisma.product.groupBy({
        by: ['uploaderId'],
        where: { archivedAt: null, uploaderId: { in: ownerIds } },
        _count: true,
      }),
      prisma.product.groupBy({
        by: ['storeId', 'uploaderId'],
        where: { archivedAt: null, storeId: { in: storeIds }, uploaderId: { in: ownerIds } },
        _count: true,
      }),
    ]);

    const storeCountMap = new Map(storeCounts.map((c: any) => [c.storeId, c._count]));
    const ownerCountMap = new Map(ownerCounts.map((c: any) => [c.uploaderId, c._count]));
    const intersectionMap = new Map(intersectionCounts.map((c: any) => [`${c.storeId}:${c.uploaderId}`, c._count]));

    return NextResponse.json(
      {
        stores: stores.map((store) => {
          const sCount = storeCountMap.get(store.id) || 0;
          const oCount = ownerCountMap.get(store.ownerId) || 0;
          const iCount = intersectionMap.get(`${store.id}:${store.ownerId}`) || 0;
          const combinedCount = sCount + oCount - iCount;
          return mapStore(store, combinedCount);
        }),
      },
      { headers: { 'Cache-Control': cacheControl } }
    );
  } catch (error) {
    console.error('Stores GET failed', error);
    return NextResponse.json(
      { error: 'Failed to load stores' },
      { status: 500, headers: { 'Cache-Control': PRIVATE_CACHE_CONTROL } }
    );
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
    const rawName = (body.name || '').trim();
    const rawSlug = (body.slug || rawName).trim();
    const bio = body.bio ?? '';
    const avatarUrl = body.avatarUrl ?? null;
    const coverUrl = body.coverUrl ?? null;
    const websiteUrl = body.websiteUrl ?? null;
    const requestPublish = body.isPublished;

    if (!rawName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!rawSlug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const slug = slugify(rawSlug) || slugify(rawName);
    const ownerId = user.role === 'admin' && body.ownerId ? body.ownerId : user.id;

    const existingBySlug = await prisma.store.findUnique({ where: { slug } });
    if (existingBySlug && existingBySlug.ownerId !== ownerId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Slug is already taken' }, { status: 400 });
    }
    const existingByOwner = await prisma.store.findFirst({ where: { ownerId } });
    const targetStore = existingByOwner || (existingBySlug?.ownerId === ownerId ? existingBySlug : null);

    const data: any = {
      name: rawName,
      slug,
      bio,
      avatarUrl,
      coverUrl,
      websiteUrl,
      ownerId,
    };

    if (requestPublish !== undefined) {
      data.isPublished = !!requestPublish;
    }

    const store = targetStore
      ? await prisma.store.update({
        where: { id: targetStore.id },
        data,
        include: { _count: { select: { products: true } } },
      })
      : await prisma.store.create({
        data,
        include: { _count: { select: { products: true } } },
      });

    // Server-rendered store pages cache for 60 s — show the change right away.
    revalidateTag('stores');
    return NextResponse.json({ store: mapStore(store) });
  } catch (error) {
    console.error('Stores POST failed', error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
        ? `Unique constraint failed on ${error?.meta?.target || 'field'}`
        : (error as any)?.message || 'Failed to save store';
    const status =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
