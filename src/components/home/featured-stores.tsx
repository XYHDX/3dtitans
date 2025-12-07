'use client';

import { useMemo } from 'react';
import { useStores } from '@/hooks/use-data';
import { useTranslation } from '../language-provider';
import { StoreCard } from '../store-card';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function FeaturedStores() {
  const { data: stores, loading } = useStores();
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
    <section className="py-16 md:py-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
        <div>
          <h2 className="font-headline text-4xl md:text-5xl tracking-wide">{t('stores.title')}</h2>
          <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
            {t('stores.subtitle')}
          </p>
        </div>
        <Button variant="ghost" asChild className="mt-4 md:mt-0">
          <Link href="/stores">
            {t('stores.viewAll')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
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
