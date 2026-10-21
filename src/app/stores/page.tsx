'use client';

import { useMemo, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { StoreCard } from '@/components/store-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStores } from '@/hooks/use-data';
import { useTranslation } from '@/components/language-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StoresPage() {
  const { data: stores, loading, error, refresh } = useStores();
  const { t } = useTranslation();
  const [sort, setSort] = useState<'recent' | 'name' | 'products'>('recent');
  const [query, setQuery] = useState('');

  const getDateValue = (value?: any) => {
    if (!value) return 0;
    const raw = typeof value === 'object' && 'toDate' in value ? value.toDate() : new Date(value as any);
    const date = raw instanceof Date ? raw : new Date(raw);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  };

  const sortedStores = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = (stores || []).filter((store) => {
      if (!term) return true;
      return store.name.toLowerCase().includes(term) || store.slug.toLowerCase().includes(term);
    });
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'products') return (b.productsCount || 0) - (a.productsCount || 0);
      return getDateValue(b.updatedAt || b.createdAt) - getDateValue(a.updatedAt || a.createdAt);
    });
  }, [stores, sort, query]);

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div className="text-center md:text-start min-w-0">
          <h1 className="font-headline text-2xl sm:text-4xl md:text-5xl [overflow-wrap:anywhere]">{t('stores.title')}</h1>
          <p className="text-muted-foreground mt-3 text-lg">{t('stores.subtitle')}</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <div className="w-full md:w-64">
            <label htmlFor="stores-search" className="sr-only">
              {t('catalog.stores.searchLabel', 'Search stores')}
            </label>
            <Input
              id="stores-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('catalog.stores.searchPlaceholder', 'Search stores by name')}
            />
          </div>
          <div className="flex items-center gap-2 justify-center md:justify-end">
            <span id="stores-sort-label" className="text-sm text-muted-foreground">
              {t('catalog.stores.sortBy', 'Sort by')}
            </span>
            <Select value={sort} onValueChange={(value) => setSort(value as 'recent' | 'name' | 'products')}>
              <SelectTrigger className="w-[200px]" aria-labelledby="stores-sort-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t('catalog.stores.sortRecent', 'Recently updated')}</SelectItem>
                <SelectItem value="name">{t('catalog.stores.sortName', 'Name (A–Z)')}</SelectItem>
                <SelectItem value="products">{t('catalog.stores.sortProducts', 'Most products')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)
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
        ) : sortedStores.length > 0 ? (
          sortedStores.map((store) => <StoreCard key={store.id} store={store} />)
        ) : (
          <p className="col-span-full text-center text-muted-foreground">
            {query.trim() ? t('catalog.stores.noMatches', 'No stores match your search.') : t('stores.empty')}
          </p>
        )}
      </div>
    </div>
  );
}
