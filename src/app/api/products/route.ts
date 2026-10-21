import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { PRIVATE_CACHE_CONTROL, PUBLIC_CACHE_CONTROL } from '@/app/products/_lib/http-cache';
import {
  PRODUCT_LIST_SELECT,
  PUBLIC_LIST_ORDER,
  mapListProduct,
  categoryWhere,
  normalizeCategory,
  parseGallery,
  textSearchWhere,
} from '@/app/products/_lib/product-list';

// API routes depend on the request (query string / session cookies) and must
// never be pre-rendered at build time. CDN caching is controlled per response
// with Cache-Control below.
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;
const MAX_OFFSET = 10_000;
const FEATURED_COUNT = 6;
/** Safety cap for dashboard lists (admin / store owner). */
const MANAGE_MAX = 1000;
/** Cap for the legacy (un-paginated) list used by installed mobile app builds. */
const LEGACY_MAX = 200;
/**
 * Any of these marks a request from the current web client. A request with
 * none of them (only storeSlug / storeId / uploaderId, or nothing) gets the
 * legacy full-item list the published mobile app parses.
 */
const NEW_LIST_PARAMS = ['limit', 'offset', 'cursor', 'featured', 'scope', 'category', 'q'];

/** Price must be a positive number with at most 2 decimals. Returns the number or null. */
function parsePrice(raw: unknown): number | null {
  const n = typeof raw === 'string' ? Number(raw.trim()) : Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 100_000_000) return null;
  return Math.round(n * 100) / 100;
}

/** Full product (dashboards / POST response) — includes description, tags, whole gallery and archive state. */
function mapProduct(product: any) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price),
    description: product.description || '',
    tags: product.tags ? product.tags.split(',').filter(Boolean) : [],
    imageUrl: product.imageUrl,
    imageGallery: parseGallery(product.imageGallery),
    imageHint: product.imageHint || undefined,
    uploaderId: product.uploaderId,
    uploaderName: product.uploaderName || product.uploader?.name || 'Unknown',
    // uploaderEmail intentionally omitted from public mapping — PII leak.
    // Admin endpoints inject it explicitly via `{ ...product, uploaderEmail: user.email }`.
    storeId: product.storeId || null,
    storeName: product.store?.name,
    storeSlug: product.store?.slug,
    storeAvatarUrl: product.store?.avatarUrl || null,
    rating: product.rating || 0,
    reviewCount: product.reviewCount || 0,
    has3dPreview: product.has3dPreview || false,
    createdAt: product.createdAt,
    isPrioritizedStore: !!product.uploader?.isPrioritizedStore,
    /** Archived products are hidden from the shop but kept for order history. */
    archived: !!product.archivedAt,
    archivedAt: product.archivedAt || null,
  };
}

function intParam(raw: string | null, fallback: number, min: number, max: number) {
  const n = Number.parseInt(raw || '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * Legacy list of prioritised uploader IDs (written by the users API when the
 * isPrioritizedStore column was missing). Read-only here; never creates tables.
 */
async function getLegacyPrioritizedIds(): Promise<string[]> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: 'prioritizedStoreIds' } });
    const ids = row?.value ? JSON.parse(row.value) : [];
    return Array.isArray(ids) ? ids.filter((v): v is string => typeof v === 'string' && v.length > 0) : [];
  } catch (error) {
    console.error('Failed to read prioritizedStoreIds', error);
    return [];
  }
}

/** storeId / storeSlug / uploaderId filters shared by the public and dashboard lists. */
async function ownershipFilters(url: URL): Promise<Prisma.ProductWhereInput | null> {
  const storeId = url.searchParams.get('storeId') || undefined;
  const storeSlug = url.searchParams.get('storeSlug') || undefined;
  const uploaderId = url.searchParams.get('uploaderId') || undefined;

  const and: Prisma.ProductWhereInput[] = [];
  if (storeId) and.push({ storeId });
  if (uploaderId) and.push({ uploaderId });
  if (storeSlug) {
    const store = await prisma.store.findUnique({ where: { slug: storeSlug }, select: { id: true, ownerId: true } });
    if (!store) return null; // unknown store → empty list
    // Products explicitly linked to the store plus any legacy products by the same owner.
    and.push({ OR: [{ storeId: store.id }, { uploaderId: store.ownerId }] });
  }
  return and.length ? { AND: and } : {};
}

function json(body: unknown, cacheControl: string, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': cacheControl } });
}

/**
 * Dashboard variant (`?scope=manage`): admins see every product, store owners
 * only their own — archived ones included, flagged with `archived`. Never cached.
 */
async function getManagedProducts(url: URL) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || (user.role !== 'admin' && user.role !== 'store-owner')) {
    return json({ error: 'Unauthorized' }, PRIVATE_CACHE_CONTROL, 401);
  }

  let where: Prisma.ProductWhereInput;
  if (user.role === 'admin') {
    const filters = await ownershipFilters(url);
    if (!filters) return json({ products: [] }, PRIVATE_CACHE_CONTROL);
    where = filters;
  } else {
    // Store owners can only ever list their own products.
    where = { uploaderId: user.id };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: MANAGE_MAX,
    include: {
      uploader: { select: { id: true, name: true, isPrioritizedStore: true } },
      store: { select: { id: true, name: true, slug: true, avatarUrl: true } },
    },
  });
  return json({ products: products.map(mapProduct) }, PRIVATE_CACHE_CONTROL);
}

/** `?featured=1`: up to 6 products from prioritised stores, topped up with the newest products. */
async function getFeaturedProducts() {
  const legacyIds = await getLegacyPrioritizedIds();
  const prioritizedWhere: Prisma.ProductWhereInput = {
    archivedAt: null,
    OR: [
      { uploader: { isPrioritizedStore: true } },
      ...(legacyIds.length ? [{ uploaderId: { in: legacyIds } }] : []),
    ],
  };
  const prioritized = await prisma.product.findMany({
    where: prioritizedWhere,
    orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take: FEATURED_COUNT,
    select: PRODUCT_LIST_SELECT,
  });

  let rows = prioritized;
  if (rows.length < FEATURED_COUNT) {
    const newest = await prisma.product.findMany({
      where: { archivedAt: null, id: { notIn: rows.map((r) => r.id) } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: FEATURED_COUNT - rows.length,
      select: PRODUCT_LIST_SELECT,
    });
    rows = [...rows, ...newest];
  }

  const legacy = new Set(legacyIds);
  return rows.map((row) => {
    const mapped = mapListProduct(row);
    return { ...mapped, isPrioritizedStore: mapped.isPrioritizedStore || legacy.has(row.uploaderId) };
  });
}

/** Full product without dashboard-only fields — the item shape older clients expect. */
function mapLegacyProduct(product: any) {
  const { archived: _archived, archivedAt: _archivedAt, ...legacy } = mapProduct(product);
  return legacy;
}

/**
 * Legacy list (no paging params): `{ products }` with full items (description,
 * tags, whole gallery…), archived products excluded, prioritised stores first,
 * capped at 200. Kept for published mobile app builds that can't be updated.
 */
async function getLegacyProducts(url: URL) {
  const filters = await ownershipFilters(url);
  if (!filters) return json({ products: [] }, PUBLIC_CACHE_CONTROL);

  const [legacyIds, products] = await Promise.all([
    getLegacyPrioritizedIds(),
    prisma.product.findMany({
      where: { AND: [{ archivedAt: null }, filters] },
      orderBy: PUBLIC_LIST_ORDER,
      take: LEGACY_MAX,
      include: {
        uploader: { select: { id: true, name: true, isPrioritizedStore: true } },
        store: { select: { id: true, name: true, slug: true, avatarUrl: true } },
      },
    }),
  ]);
  const legacy = new Set(legacyIds);
  return json(
    {
      products: products.map((p) => {
        const mapped = mapLegacyProduct(p);
        return { ...mapped, isPrioritizedStore: mapped.isPrioritizedStore || legacy.has(p.uploaderId) };
      }),
    },
    PUBLIC_CACHE_CONTROL
  );
}

/**
 * GET /api/products
 *
 * Public (cached on the CDN, archived products excluded):
 *   ?limit=24 (max 60) &offset=0 (alias: cursor) → { products, nextOffset }
 *   ?category=  ?q=  ?storeSlug=  ?storeId=  ?uploaderId=   filters
 *   ?featured=1 → 6 products for the home page
 * Dashboards:
 *   ?scope=manage[&uploaderId=|storeId=|storeSlug=] → every product the caller
 *   may manage, archived ones flagged (admin / store owner only, never cached).
 * Legacy (none of limit/offset/cursor/featured/scope/category/q — published
 * mobile app): { products } with full items, max 200. The web always sends `limit`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  try {
    if (!NEW_LIST_PARAMS.some((k) => url.searchParams.has(k))) {
      return await getLegacyProducts(url);
    }

    if (url.searchParams.get('scope') === 'manage') {
      return await getManagedProducts(url);
    }

    if (url.searchParams.get('featured') === '1') {
      const products = await getFeaturedProducts();
      return json({ products, nextOffset: null }, PUBLIC_CACHE_CONTROL);
    }

    const limit = intParam(url.searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = intParam(url.searchParams.get('offset') ?? url.searchParams.get('cursor'), 0, 0, MAX_OFFSET);

    const filters = await ownershipFilters(url);
    if (!filters) return json({ products: [], nextOffset: null }, PUBLIC_CACHE_CONTROL);

    const and: Prisma.ProductWhereInput[] = [{ archivedAt: null }, filters];
    const category = normalizeCategory(url.searchParams.get('category'));
    if (category) and.push(categoryWhere(category));
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    if (q) and.push(textSearchWhere(q));

    // One extra row tells us whether there is another page.
    const rows = await prisma.product.findMany({
      where: { AND: and },
      orderBy: PUBLIC_LIST_ORDER,
      skip: offset,
      take: limit + 1,
      select: PRODUCT_LIST_SELECT,
    });
    const hasMore = rows.length > limit;
    return json(
      {
        products: rows.slice(0, limit).map(mapListProduct),
        nextOffset: hasMore ? offset + limit : null,
      },
      PUBLIC_CACHE_CONTROL
    );
  } catch (error) {
    console.error('Products GET failed', error);
    return json({ error: 'Failed to load products' }, PRIVATE_CACHE_CONTROL, 500);
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
    const validPrice = parsePrice(price);
    if (validPrice === null) {
      return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
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
        price: validPrice,
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

    // Server-rendered store pages cache for 60 s — list the new product right away.
    revalidateTag('products');
    return NextResponse.json({ product: mapProduct({ ...product, uploaderEmail: user.email || '' }) });
  } catch (error) {
    console.error('Products POST failed', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
