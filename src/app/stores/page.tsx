'use client';

import { StoreCard } from '@/components/store-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStores } from '@/hooks/use-data';
import { useTranslation } from '@/components/language-provider';

export default function StoresPage() {
  const { data: stores, loading } = useStores();
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="font-headline text-5xl">{t('stores.title')}</h1>
        <p className="text-muted-foreground mt-3 text-lg">{t('stores.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)
        ) : stores && stores.length > 0 ? (
          stores.map((store) => <StoreCard key={store.id} store={store} />)
        ) : (
          <p className="col-span-full text-center text-muted-foreground">{t('stores.empty')}</p>
        )}
      </div>
    </div>
  );
}
