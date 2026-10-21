'use client';

import { useProductList } from '@/hooks/use-data';
import { useTranslation } from '@/components/language-provider';
import { CARD_IMAGE_SIZES_3COL, ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, RotateCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Product } from '@/lib/types';

export type StoreDetail = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  websiteUrl: string | null;
  productsCount: number;
};

type Props = {
  store: StoreDetail;
  /** First page of products, rendered on the server. */
  initialProducts: Product[];
  initialNextOffset: number | null;
  pageSize: number;
};

function externalUrl(url?: string | null) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

/** Readable link on light backgrounds (dark text, yellow underline); yellow text only in dark mode. */
const linkClass =
  'inline-flex items-center gap-1 text-sm font-bold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:bg-accent hover:text-accent-foreground dark:text-primary dark:hover:text-accent-foreground';

export function StoreDetailClient({ store, initialProducts, initialNextOffset, pageSize }: Props) {
  const { t } = useTranslation();
  const {
    data: products,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  } = useProductList(
    { storeSlug: store.slug, pageSize },
    { initial: { products: initialProducts, nextOffset: initialNextOffset } }
  );
  const website = externalUrl(store.websiteUrl);

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10">
      <div className="relative overflow-hidden rounded-3xl border">
        <div className="relative h-48 sm:h-64 bg-muted">
          {store.coverUrl && (
            <Image
              src={store.coverUrl}
              alt=""
              fill
              priority
              sizes="(max-width: 1400px) 100vw, 1400px"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/75 to-transparent" />
        </div>
        <div className="relative px-6 pb-8 -mt-16 flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
            <AvatarImage src={store.avatarUrl || undefined} alt="" />
            <AvatarFallback className="text-lg font-semibold">{getInitials(store.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground drop-shadow-md [overflow-wrap:anywhere]">
              {store.name}
            </h1>
            {website && (
              <Link href={website} target="_blank" rel="noopener noreferrer" className={`${linkClass} mt-2`}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t('stores.visitSite')}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/stores">
                <ArrowLeft className="h-4 w-4 me-1 rtl:rotate-180" aria-hidden="true" />
                {t('stores.back')}
              </Link>
            </Button>
            <div className="text-sm text-muted-foreground">
              {t('stores.productsCount', '', { count: store.productsCount })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>{t('stores.bioHeading')}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line [overflow-wrap:anywhere]">
              {store.bio || t('stores.noBio')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t('stores.atAGlance')}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <dt className="text-muted-foreground">{t('stores.productsLabel')}</dt>
                <dd className="font-medium">{store.productsCount}</dd>
              </div>
              {website && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-muted-foreground">{t('stores.website')}</dt>
                  <dd>
                    <Link href={website} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {t('stores.visitSite')}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold">{t('stores.productsHeading')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy={loading || loadingMore}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)
          ) : error && products.length === 0 ? (
            <div className="col-span-full text-center" role="alert">
              <p className="font-bold">{t('catalog.error.productsTitle', "We couldn't load products right now.")}</p>
              <Button variant="outline" className="mt-4" onClick={() => retry()}>
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                {t('catalog.error.retry', 'Try again')}
              </Button>
            </div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product.id} product={product} sizes={CARD_IMAGE_SIZES_3COL} />
            ))
          ) : (
            <p className="col-span-full text-muted-foreground">{t('stores.noProducts')}</p>
          )}
          {loadingMore && Array.from({ length: 3 }).map((_, i) => <Skeleton key={`more-${i}`} className="h-72 w-full" />)}
        </div>
        {!loading && products.length > 0 && (error || hasMore) && (
          <div className="pt-6 flex flex-col items-center gap-2">
            {error && (
              <p className="text-sm text-muted-foreground" role="alert">
                {t('catalog.error.moreProducts', "We couldn't load more products.")}
              </p>
            )}
            <Button variant="outline" size="lg" onClick={() => (error ? retry() : loadMore())} disabled={loadingMore}>
              {error ? t('catalog.error.retry', 'Try again') : t('catalog.products.loadMore', 'Load more')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
