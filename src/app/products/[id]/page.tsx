import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  SITE_URL,
  getProductForPage,
  getStorefrontSettings,
  jsonLdString,
  metaDescription,
} from '../_lib/catalog-server';
import { getServerTranslator } from '@/lib/i18n-server';
import { ProductDetailClient } from './product-detail-client';

// ISR: product data is re-read at most once a minute (see getProductForPage).
// The root layout currently renders dynamically, which is fine — metadata and
// the server-rendered HTML work either way.
export const revalidate = 60;

type Props = { params: { id: string } };

function productUrl(id: string) {
  return `${SITE_URL}/products/${encodeURIComponent(id)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductForPage(params.id);
  if (!product) return {};

  const t = getServerTranslator();
  const description = metaDescription(
    product.description ||
      t('catalog.meta.productFallback', '{name} — {category}. Order online from 3D Titans.', {
        name: product.name,
        category: product.category,
      })
  );
  const url = productUrl(product.id);
  const images = product.imageUrl ? [{ url: product.imageUrl, alt: product.name }] : undefined;

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: '3D Titans',
      title: product.name,
      description,
      images,
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title: product.name,
      description,
      images: product.imageUrl ? [product.imageUrl] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const [product, settings] = await Promise.all([getProductForPage(params.id), getStorefrontSettings()]);
  // Missing or archived → real 404 (not a 200 "not found" page).
  if (!product) notFound();

  const url = productUrl(product.id);
  const currency = /^[A-Z]{3}$/.test(settings.currency) ? settings.currency : '';

  // schema.org Product structured data (Google rich results, link previews).
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.imageGallery.length ? product.imageGallery : product.imageUrl ? [product.imageUrl] : undefined,
    description: product.description || undefined,
    sku: product.id,
    category: product.category || undefined,
    url,
    ...(currency
      ? {
          offers: {
            '@type': 'Offer',
            url,
            price: product.price.toFixed(2),
            priceCurrency: currency,
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
          },
        }
      : {}),
    ...((product.reviewCount ?? 0) > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (product.rating ?? 0).toFixed(1),
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <ProductDetailClient
        product={product}
        currency={settings.currency}
        paymentMethods={settings.paymentMethods}
        whatsappNumber={settings.whatsappNumber}
        productUrl={url}
      />
    </>
  );
}
