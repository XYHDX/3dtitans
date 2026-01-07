'use client';

import { useProducts, useStore } from '@/hooks/use-data';
import { useTranslation } from '@/components/language-provider';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { use } from 'react';

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

export default function StoreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: store, loading: storeLoading } = useStore(slug);
  const { data: products, loading: productsLoading } = useProducts({ storeSlug: slug });
  const { t } = useTranslation();

  if (storeLoading) {
    return (
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-muted-foreground">{t('stores.notFound')}</p>
        <Button asChild className="mt-4" variant="secondary">
          <Link href="/stores">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('stores.back')}
          </Link>
        </Button>
      </div>
    );
  }

  const productList = products || [];

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10">
      <div className="relative overflow-hidden rounded-3xl border">
        <div className="relative h-64 bg-muted">
          {store.coverUrl && (
            <Image src={store.coverUrl} alt={store.name} fill className="object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/75 to-transparent" />
        </div>
        <div className="px-6 pb-8 -mt-16 flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
            <AvatarImage src={store.avatarUrl || undefined} alt={store.name} />
            <AvatarFallback className="text-lg font-semibold">{getInitials(store.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground drop-shadow-md">{store.name}</h1>
            <p className="text-muted-foreground text-sm mt-1 drop-shadow-sm">/{store.slug}</p>
            {externalUrl(store.websiteUrl) && (
              <Link
                href={externalUrl(store.websiteUrl)!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                <ExternalLink className="h-4 w-4" />
                {t('stores.visitSite')}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/stores">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t('stores.back')}
              </Link>
            </Button>
            <div className="text-sm text-muted-foreground">
              {t('stores.productsCount', '', { count: store.productsCount ?? productList.length })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('stores.bioHeading')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {store.bio || t('stores.noBio')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('stores.atAGlance')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('stores.status')}</span>
              <span className="font-medium">{store.isPublished ? t('stores.published') : t('stores.draft')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('stores.productsLabel')}</span>
              <span className="font-medium">{productList.length}</span>
            </div>
            {externalUrl(store.websiteUrl) && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('stores.website')}</span>
                <Link
                  href={externalUrl(store.websiteUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t('stores.visitSite')}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">{t('stores.productsHeading')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productsLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)
          ) : productList.length > 0 ? (
            productList.map((product) => <ProductCard key={product.id} product={product} />)
          ) : (
            <p className="col-span-full text-muted-foreground">{t('stores.noProducts')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
