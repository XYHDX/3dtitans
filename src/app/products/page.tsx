
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useProducts } from '@/hooks/use-data';
import type { Product } from '@/lib/types';
import { useTranslation } from '@/components/language-provider';


export default function ProductsPage() {
  const { data: products, loading } = useProducts();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  // Accept ?q= from the SiteSearch's "See all results" deep link
  const [query, setQuery] = useState(() => searchParams.get('q') || '');

  // Keep state in sync if the URL changes (back/forward, new search from header)
  useEffect(() => {
    const urlQ = searchParams.get('q') || '';
    if (urlQ !== query) setQuery(urlQ);
    // We intentionally only re-sync when the URL changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products || [];
    return (products || []).filter((p) => {
      const name = p.name?.toLowerCase() || '';
      const category = p.category?.toLowerCase() || '';
      const description = p.description?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
      return name.includes(term) || category.includes(term) || description.includes(term) || tags.includes(term);
    });
  }, [products, query]);

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 mb-10 md:mb-16">
        <div className="text-center">
          <h1 className="font-headline text-5xl">{t('products.title')}</h1>
          <p className="text-muted-foreground mt-2 text-lg">{t('products.subtitle')}</p>
        </div>
        <div className="max-w-2xl w-full mx-auto">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products by name or category"
            aria-label="Search products"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))
        ) : filtered && filtered.length > 0 ? (
          filtered.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product}
            />
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground">{t('products.empty')}</p>
        )}
      </div>
    </div>
  );
}
