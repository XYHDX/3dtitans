import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL, STORE_PAGE_SIZE, getStoreForPage, metaDescription } from '@/app/products/_lib/catalog-server';
import { getServerTranslator } from '@/lib/i18n-server';
import { StoreDetailClient } from './store-detail-client';

// ISR: store data is re-read at most once a minute (see getStoreForPage).
export const revalidate = 60;

type Props = { params: { slug: string } };

function storeUrl(slug: string) {
  return `${SITE_URL}/stores/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getStoreForPage(params.slug);
  if (!data) return {};
  const { store } = data;

  const t = getServerTranslator();
  const description = metaDescription(
    store.bio ||
      t('catalog.meta.storeFallback', 'Browse {count} products from {store} on 3D Titans.', {
        count: store.productsCount,
        store: store.name,
      })
  );
  const url = storeUrl(store.slug);
  const image = store.coverUrl || store.avatarUrl;

  return {
    title: store.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: '3D Titans',
      title: store.name,
      description,
      images: image ? [{ url: image, alt: store.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: store.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function StorePage({ params }: Props) {
  const data = await getStoreForPage(params.slug);
  // Unknown or draft store → real 404.
  if (!data) notFound();

  return (
    <StoreDetailClient
      store={data.store}
      initialProducts={data.products}
      initialNextOffset={data.nextOffset}
      pageSize={STORE_PAGE_SIZE}
    />
  );
}
