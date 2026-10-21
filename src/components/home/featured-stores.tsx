'use client';

import { useMemo } from 'react';
import { useStores } from '@/hooks/use-data';
import { useTranslation } from '../language-provider';
import { StoreCard } from '../store-card';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import Link from 'next/link';
import { ArrowRight, RotateCw } from 'lucide-react';

export function FeaturedStores() {
  const { data: stores, loading, error, refresh } = useStores();
  const { t } = useTranslation();
  const topStores = useMemo(() => {
    const getDateValue = (value?: any) => {
      if (!value) return 0;
      const raw = typeof value === 'object' && 'toDate' in value ? value.toDate() : new Date(value as any);
      const date = raw instanceof Date ? raw : new Date(raw);
      return isNaN(date.getTime()) ? 0 : date.getTime();
    };

    return [...(stores || [])]
      .sort((a, b) => getDateValue(b.updatedAt || b.createdAt) - getDateValue(a.updatedAt || a.createdAt))
      .slice(0, 3);
  }, [stores]);

  return (
    <section className="py-16 md:py-24" aria-labelledby="featured-stores-heading">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-start gap-4 min-w-0">
          <span className="font-headline text-xs px-3 py-2 bg-foreground text-background shrink-0" aria-hidden="true">02</span>
          <div className="min-w-0">
            <h2 id="featured-stores-heading" className="font-headline text-xl sm:text-2xl md:text-4xl [overflow-wrap:anywhere]">
              {t('stores.title')}
            </h2>
            <p className="mt-3 text-base text-muted-foreground max-w-2xl">
              {t('stores.subtitle')}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <Link href="/stores">
            {t('stores.viewAll')}
            <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
        ) : error ? (
          <div className="col-span-full text-center" role="alert">
            <p className="font-bold">{t('catalog.error.storesTitle', "We couldn't load stores right now.")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('catalog.error.desc', 'Please check your connection and try again.')}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refresh()}>
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              {t('catalog.error.retry', 'Try again')}
            </Button>
          </div>
        ) : topStores.length > 0 ? (
          topStores.map((store) => <StoreCard key={store.id} store={store} />)
        ) : (
          <div className="col-span-full text-center text-muted-foreground">
            <p>{t('stores.empty')}</p>
            <Button asChild variant="link" className="mt-2">
              <Link href="/signup">{t('stores.ownerCta')}</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
