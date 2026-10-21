'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RotateCw, X } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProductList } from '@/hooks/use-data';
import { useTranslation } from '@/components/language-provider';

const PAGE_SIZE = 24;
/** Cards in the first row(s) load eagerly — one of them is usually the LCP image. */
const EAGER_CARDS = 4;

function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </>
  );
}

/**
 * Inner component that reads `?q=` and `?category=` from the URL.
 *
 * Next 14 App Router requires any component using `useSearchParams` to be
 * wrapped in <Suspense> at the page level, otherwise prerender fails with
 * a "useSearchParams should be wrapped in a suspense boundary" error.
 */
function ProductsList() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';

  // The input is local state; the URL (and so the server query) follows it after a short pause.
  const [query, setQuery] = useState(urlQ);
  const lastPushed = useRef(urlQ);

  // Keep the box in sync when the URL changes elsewhere (back/forward, header search).
  useEffect(() => {
    if (urlQ !== lastPushed.current) {
      lastPushed.current = urlQ;
      setQuery(urlQ);
    }
  }, [urlQ]);

  useEffect(() => {
    const term = query.trim();
    if (term === lastPushed.current.trim()) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) params.set('q', term);
      else params.delete('q');
      lastPushed.current = term;
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    }, 350);
    return () => clearTimeout(timer);
  }, [query, pathname, router, searchParams]);

  const { data: products, loading, loadingMore, error, hasMore, loadMore, retry } = useProductList({
    q: urlQ,
    category,
    pageSize: PAGE_SIZE,
  });

  const categoryLabel = category.replace(/[-_+]+/g, ' ').trim();
  const clearCategoryHref = (() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('category');
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  })();
  const isFiltered = !!(urlQ.trim() || categoryLabel);

  return (
    <>
      <div className="flex flex-col gap-6 mb-10 md:mb-16">
        <div className="text-center">
          <h1 className="font-headline text-2xl sm:text-4xl md:text-5xl [overflow-wrap:anywhere]">{t('products.title')}</h1>
          <p className="text-muted-foreground mt-2 text-lg">{t('products.subtitle')}</p>
        </div>
        <div className="max-w-2xl w-full mx-auto flex flex-col gap-3">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              // Apply immediately on Enter.
              const params = new URLSearchParams(searchParams.toString());
              const term = query.trim();
              if (term) params.set('q', term);
              else params.delete('q');
              lastPushed.current = term;
              const qs = params.toString();
              router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
            }}
          >
            <label htmlFor="products-search" className="sr-only">
              {t('catalog.products.searchLabel', 'Search products')}
            </label>
            <Input
              id="products-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('catalog.products.searchPlaceholder', 'Search products by name or category')}
              maxLength={100}
            />
          </form>
          {categoryLabel && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('catalog.products.categoryLabel', 'Category:')}</span>
              <Link
                href={clearCategoryHref}
                scroll={false}
                className="inline-flex items-center gap-1 border-[2px] border-foreground bg-accent text-accent-foreground px-2 py-0.5 font-bold"
                aria-label={t('catalog.products.clearCategory', 'Remove category filter: {category}', { category: categoryLabel })}
              >
                <span className="[overflow-wrap:anywhere]">{categoryLabel}</span>
                <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8" aria-busy={loading || loadingMore}>
        {loading ? (
          <ProductGridSkeleton />
        ) : error && products.length === 0 ? (
          <div className="col-span-full text-center" role="alert">
            <p className="font-bold">{t('catalog.error.productsTitle', "We couldn't load products right now.")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('catalog.error.desc', 'Please check your connection and try again.')}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => retry()}>
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              {t('catalog.error.retry', 'Try again')}
            </Button>
          </div>
        ) : products.length > 0 ? (
          products.map((product, i) => (
            <ProductCard key={product.id} product={product} priority={i < EAGER_CARDS} />
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground">
            {isFiltered ? t('catalog.products.noMatches', 'No products match your search.') : t('products.empty')}
          </p>
        )}
        {loadingMore && <ProductGridSkeleton count={4} />}
      </div>

      {!loading && products.length > 0 && (error || hasMore) && (
        <div className="mt-10 flex flex-col items-center gap-2">
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
    </>
  );
}

function ProductsFallback() {
  return (
    <>
      <div className="flex flex-col gap-6 mb-10 md:mb-16">
        <div className="text-center">
          <Skeleton className="h-12 w-72 max-w-full mx-auto" />
          <Skeleton className="h-5 w-96 max-w-full mx-auto mt-3" />
        </div>
        <div className="max-w-2xl w-full mx-auto">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        <ProductGridSkeleton />
      </div>
    </>
  );
}

export default function ProductsPage() {
  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<ProductsFallback />}>
        <ProductsList />
      </Suspense>
    </div>
  );
}
