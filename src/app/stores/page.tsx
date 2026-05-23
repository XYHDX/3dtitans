'use client';

import { useMemo, useState } from 'react';
import { StoreCard } from '@/components/store-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useStores } from '@/hooks/use-data';
import { useTranslation } from '@/components/language-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StoresPage() {
  const { data: stores, loading } = useStores();
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
        <div className="text-center md:text-left">
          <h1 className="font-headline text-5xl">{t('stores.title')}</h1>
          <p className="text-muted-foreground mt-3 text-lg">{t('stores.subtitle')}</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <div className="w-full md:w-64">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stores by name"
              aria-label="Search stores"
            />
          </div>
          <div className="flex items-center gap-2 justify-center md:justify-end">
            <span className="text-sm text-muted-foreground">Sort by</span>
            <Select value={sort} onValueChange={(value) => setSort(value as 'recent' | 'name' | 'products')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Newest updated</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="products">Products count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)
        ) : sortedStores && sortedStores.length > 0 ? (
          sortedStores.map((store) => <StoreCard key={store.id} store={store} />)
        ) : (
          <p className="col-span-full text-center text-muted-foreground">{t('stores.empty')}</p>
        )}
      </div>
    </div>
  );
}
