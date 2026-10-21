/**
 * Product-list building blocks shared by /api/products and the server-rendered
 * catalog pages: which columns a card needs, shop ordering, filters and the
 * card mapping. Server only (Prisma types), but free of settings / payment
 * imports so the API route stays small.
 */
import type { Prisma } from '@prisma/client';
import type { Product } from '@/lib/types';

/** Columns a product card needs — description and tags stay on the detail page. */
export const PRODUCT_LIST_SELECT = {
  id: true,
  name: true,
  category: true,
  price: true,
  imageUrl: true,
  imageGallery: true,
  imageHint: true,
  uploaderId: true,
  uploaderName: true,
  storeId: true,
  rating: true,
  reviewCount: true,
  has3dPreview: true,
  createdAt: true,
  uploader: { select: { name: true, isPrioritizedStore: true } },
  store: { select: { name: true, slug: true, avatarUrl: true } },
} satisfies Prisma.ProductSelect;

type ProductListRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_LIST_SELECT }>;

/** Shop ordering: prioritised stores first, then best rated, then newest. `id` keeps pages stable. */
export const PUBLIC_LIST_ORDER: Prisma.ProductOrderByWithRelationInput[] = [
  { uploader: { isPrioritizedStore: 'desc' } },
  { rating: 'desc' },
  { createdAt: 'desc' },
  { id: 'desc' },
];

export function parseGallery(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string' && u.length > 0) : [];
  } catch {
    return [];
  }
}

/** Card-sized product (public lists). Only the first gallery image is sent. */
export function mapListProduct(row: ProductListRow): Product {
  const gallery = parseGallery(row.imageGallery);
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    imageUrl: row.imageUrl,
    imageGallery: gallery.slice(0, 1),
    imageHint: row.imageHint || undefined,
    uploaderId: row.uploaderId,
    uploaderName: row.uploaderName || row.uploader?.name || 'Unknown',
    storeId: row.storeId || null,
    storeName: row.store?.name,
    storeSlug: row.store?.slug,
    storeAvatarUrl: row.store?.avatarUrl || null,
    rating: row.rating || 0,
    reviewCount: row.reviewCount || 0,
    has3dPreview: row.has3dPreview || false,
    // Plain string so the value survives JSON / server→client props.
    createdAt: row.createdAt.toISOString() as unknown as Product['createdAt'],
    isPrioritizedStore: !!row.uploader?.isPrioritizedStore,
  };
}

/** `?category=home-decor` → "home decor" (matched case-insensitively, as a substring). */
export function normalizeCategory(raw: string | null | undefined): string {
  return (raw || '')
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

/**
 * Accent-tolerant category filter: `decor` also matches "Décor" (Postgres
 * ILIKE is accent-sensitive and the unaccent extension isn't installed).
 * Tries the term as typed plus spellings with one e/é swapped — enough for the
 * accented category names used in the shop.
 */
export function categoryWhere(category: string): Prisma.ProductWhereInput {
  const variants = new Set<string>([category]);
  const lower = category.toLowerCase();
  for (let i = 0; i < lower.length && variants.size < 6; i++) {
    if (lower[i] === 'e') variants.add(lower.slice(0, i) + 'é' + lower.slice(i + 1));
    if (lower[i] === 'é') variants.add(lower.slice(0, i) + 'e' + lower.slice(i + 1));
  }
  return { OR: Array.from(variants, (v) => ({ category: { contains: v, mode: 'insensitive' as const } })) };
}

/** Free-text filter shared by the product list (name, category, description, tags). */
export function textSearchWhere(q: string): Prisma.ProductWhereInput {
  return {
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { tags: { contains: q, mode: 'insensitive' } },
    ],
  };
}
