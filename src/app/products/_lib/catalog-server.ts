/**
 * Data loaders for the server-rendered product and store pages (cached for
 * 60 s, tags 'products' / 'product:<id>' / 'stores' / 'store:<slug>' /
 * 'site-settings'), plus SEO helpers.
 *
 * SERVER ONLY (Prisma + payment settings). Never import this from a
 * 'use client' file.
 */
import 'server-only';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import type { Product } from '@/lib/types';
import { PRODUCT_LIST_SELECT, PUBLIC_LIST_ORDER, mapListProduct, parseGallery } from './product-list';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { getPaymentSettings } from '@/lib/payments/settings';
import { PAYMENT_METHODS, type PaymentMethodId } from '@/lib/payments/common';
import { getPublicSiteSettings } from '@/lib/site-settings';

/** Public site origin used for canonical URLs, Open Graph and JSON-LD. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://3dtitans.org').replace(/\/+$/, '');

/** How long server-rendered product / store pages reuse their database reads. */
const PAGE_DATA_TTL_SECONDS = 60;

export const STORE_PAGE_SIZE = 24;

// ---------------------------------------------------------------- product page

export type ProductPageData = Product & {
  description: string;
  tags: string[];
  imageGallery: string[];
};

async function loadProductForPage(id: string): Promise<ProductPageData | null> {
  const row = await prisma.product.findFirst({
    // Archived products are hidden from the shop → real 404.
    where: { id, archivedAt: null },
    select: { ...PRODUCT_LIST_SELECT, description: true, tags: true },
  });
  if (!row) return null;
  const card = mapListProduct(row);
  const gallery = parseGallery(row.imageGallery);
  return {
    ...card,
    imageGallery: gallery.length > 0 ? gallery : row.imageUrl ? [row.imageUrl] : [],
    description: row.description || '',
    tags: row.tags
      ? row.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
  };
}

/**
 * One product for its public page, or null when it doesn't exist / is archived.
 * Database errors are NOT swallowed: they reach the error boundary instead of
 * turning into a misleading 404.
 */
export const getProductForPage = cache(async (id: string): Promise<ProductPageData | null> => {
  if (!id || id.length > 64) return null;
  return unstable_cache(() => loadProductForPage(id), ['catalog-product-page', id], {
    revalidate: PAGE_DATA_TTL_SECONDS,
    tags: ['products', `product:${id}`],
  })();
});

// ------------------------------------------------------------------ store page

export type StorePageStore = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  websiteUrl: string | null;
  ownerId: string;
  isPublished: boolean;
  productsCount: number;
};

export type StorePageData = {
  store: StorePageStore;
  products: Product[];
  nextOffset: number | null;
};

/** Products shown on a store page: linked to the store, or legacy products by its owner. */
export function storeProductsWhere(store: { id: string; ownerId: string }): Prisma.ProductWhereInput {
  return { archivedAt: null, OR: [{ storeId: store.id }, { uploaderId: store.ownerId }] };
}

async function loadStoreForPage(slug: string): Promise<StorePageData | null> {
  const store = await prisma.store.findFirst({
    // Draft stores are not public → real 404.
    where: { slug, isPublished: true },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      avatarUrl: true,
      coverUrl: true,
      websiteUrl: true,
      ownerId: true,
      isPublished: true,
    },
  });
  if (!store) return null;

  const where = storeProductsWhere(store);
  const [productsCount, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: PUBLIC_LIST_ORDER,
      take: STORE_PAGE_SIZE + 1,
      select: PRODUCT_LIST_SELECT,
    }),
  ]);

  return {
    store: {
      ...store,
      bio: store.bio || '',
      avatarUrl: store.avatarUrl || null,
      coverUrl: store.coverUrl || null,
      websiteUrl: store.websiteUrl || null,
      productsCount,
    },
    products: rows.slice(0, STORE_PAGE_SIZE).map(mapListProduct),
    nextOffset: rows.length > STORE_PAGE_SIZE ? STORE_PAGE_SIZE : null,
  };
}

export const getStoreForPage = cache(async (slug: string): Promise<StorePageData | null> => {
  if (!slug || slug.length > 120) return null;
  return unstable_cache(() => loadStoreForPage(slug), ['catalog-store-page', slug], {
    revalidate: PAGE_DATA_TTL_SECONDS,
    tags: ['stores', 'products', `store:${slug}`],
  })();
});

// ------------------------------------------------------- storefront settings

export type StorefrontSettings = {
  /** Store currency code from admin → Settings → Payments (e.g. "USD"). */
  currency: string;
  /** Payment methods a customer can actually use right now. */
  paymentMethods: PaymentMethodId[];
  /** Shop WhatsApp number ("+963…", admin → Settings), or null when not configured. */
  whatsappNumber: string | null;
};

async function loadPaymentSummary(): Promise<{ currency: string; paymentMethods: PaymentMethodId[] }> {
  const payments = await getPaymentSettings();
  return {
    currency: payments.currency,
    paymentMethods: PAYMENT_METHODS.filter((m) => payments.available[m]),
  };
}

const getCachedPaymentSummary = unstable_cache(loadPaymentSummary, ['catalog-payment-summary'], {
  revalidate: PAGE_DATA_TTL_SECONDS,
  tags: ['site-settings'],
});

/**
 * Currency, accepted payment methods and WhatsApp number for product pages.
 * A settings hiccup must not take the product page down: on error the page
 * renders without those extras.
 */
export const getStorefrontSettings = cache(async (): Promise<StorefrontSettings> => {
  const [payments, site] = await Promise.all([
    getCachedPaymentSummary().catch((err) => {
      console.error('catalog: payment settings unavailable', err);
      return { currency: '', paymentMethods: [] as PaymentMethodId[] };
    }),
    // Cached and never throws (returns empty values on a DB error).
    getPublicSiteSettings(),
  ]);
  return { ...payments, whatsappNumber: site.whatsappNumber || null };
});

/** Trim text to a meta-description length on a word boundary. */
export function metaDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** JSON for a <script type="application/ld+json"> — `<` escaped so content can't close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
