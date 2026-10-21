import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { PRIVATE_CACHE_CONTROL, PUBLIC_CACHE_CONTROL } from '@/app/products/_lib/http-cache';

// API routes depend on the request (query string / session cookies) and must
// never be pre-rendered at build time.
export const dynamic = 'force-dynamic';

const MIN_QUERY = 2;
const MAX_QUERY = 100;
const MAX_LIMIT = 20;

/**
 * Sitewide search across Products and Stores.
 *
 * Query: GET /api/search?q=<term>&limit=<n>
 * Returns: { products: [...], stores: [...], query }
 *
 * Terms shorter than 2 characters return nothing (they would match almost
 * every row); terms are cut to 100 characters. Archived products and draft
 * stores are never returned. Rate-limited per IP (60 / minute).
 *
 * Currently uses Prisma `contains` (case-insensitive). For scale (>50k products),
 * apply scripts/search_fts_migration.sql to add tsvector + GIN, then swap the
 * Prisma calls below for raw $queryRawUnsafe using `to_tsquery`.
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, 'search', { windowMs: 60_000, max: 300 });
  if (!limited.ok) {
    return NextResponse.json(
      { products: [], stores: [], query: '', error: 'Too many searches. Please wait a moment.' },
      {
        status: 429,
        headers: {
          'Cache-Control': PRIVATE_CACHE_CONTROL,
          'Retry-After': String(Math.max(1, Math.ceil((limited.retryAfter || 60_000) / 1000))),
        },
      }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().slice(0, MAX_QUERY);
    const limitParam = parseInt(searchParams.get('limit') || '5', 10);
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 5, 1), MAX_LIMIT);

    if (q.length < MIN_QUERY) {
      return NextResponse.json(
        { products: [], stores: [], query: q },
        { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
      );
    }

    const [productsRaw, storesRaw] = await Promise.all([
      // PRODUCTS — match on name, category, description, tags (shop-visible only)
      prisma.product.findMany({
        where: {
          archivedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { tags: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          imageUrl: true,
          store: { select: { name: true, slug: true } },
        },
        take: limit,
        orderBy: [
          // Loose rank: prioritized stores first, then newest
          { uploader: { isPrioritizedStore: 'desc' } },
          { createdAt: 'desc' },
        ],
      }),
      // STORES — match on name, bio (published only)
      prisma.store.findMany({
        where: {
          isPublished: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { bio: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, slug: true, bio: true, avatarUrl: true },
        take: Math.min(limit, 3),
        orderBy: [{ updatedAt: 'desc' }],
      }),
    ]);

    const products = productsRaw.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      imageUrl: p.imageUrl,
      storeName: p.store?.name || null,
      storeSlug: p.store?.slug || null,
    }));

    const stores = storesRaw.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      bio: s.bio || '',
      avatarUrl: s.avatarUrl || null,
    }));

    return NextResponse.json(
      { products, stores, query: q },
      { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
    );
  } catch (err: any) {
    console.error('search route error', err);
    return NextResponse.json(
      { products: [], stores: [], query: '', error: 'Search failed' },
      { status: 500, headers: { 'Cache-Control': PRIVATE_CACHE_CONTROL } }
    );
  }
}
