import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * Sitewide search across Products and Stores.
 *
 * Query: GET /api/search?q=<term>&limit=<n>
 * Returns: { products: [...], stores: [...], query }
 *
 * Currently uses Prisma `contains` (case-insensitive). For scale (>50k products),
 * apply scripts/search_fts_migration.sql to add tsvector + GIN, then swap the
 * Prisma calls below for raw $queryRawUnsafe using `to_tsquery`.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQ = searchParams.get('q') || '';
    const q = rawQ.trim();
    const limitParam = parseInt(searchParams.get('limit') || '5', 10);
    const limit = Math.min(Math.max(limitParam, 1), 20);

    if (q.length < 1) {
      return NextResponse.json({ products: [], stores: [], query: q });
    }

    // PRODUCTS — match on name (highest), category, description, tags
    const productsRaw = await prisma.product.findMany({
      where: {
        OR: [
          { name:        { contains: q, mode: 'insensitive' } },
          { category:    { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { tags:        { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        store: { select: { name: true, slug: true } },
      },
      take: limit,
      orderBy: [
        // Loose rank: prioritize prioritized stores, then newest
        { uploader: { isPrioritizedStore: 'desc' } as any },
        { createdAt: 'desc' },
      ] as any,
    }).catch(() => [] as any[]);

    // STORES — match on name, bio (published only)
    const storesRaw = await prisma.store.findMany({
      where: {
        isPublished: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { bio:  { contains: q, mode: 'insensitive' } },
        ],
      },
      take: Math.min(limit, 3),
      orderBy: [{ updatedAt: 'desc' }],
    }).catch(() => [] as any[]);

    const products = productsRaw.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      imageUrl: p.imageUrl,
      storeName: p.store?.name || null,
      storeSlug: p.store?.slug || null,
    }));

    const stores = storesRaw.map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      bio: s.bio || '',
      avatarUrl: s.avatarUrl || null,
    }));

    return NextResponse.json({ products, stores, query: q });
  } catch (err: any) {
    console.error('search route error', err);
    return NextResponse.json(
      { products: [], stores: [], query: '', error: 'Search failed' },
      { status: 500 }
    );
  }
}
