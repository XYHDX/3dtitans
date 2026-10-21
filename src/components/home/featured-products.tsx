'use client';
import Link from 'next/link';
import { Button } from '../ui/button';
import { CARD_IMAGE_SIZES_3COL, ProductCard } from '../product-card';
import { ArrowRight, RotateCw } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useFeaturedProducts } from '@/hooks/use-data';
import { useTranslation } from '../language-provider';

export function FeaturedProducts() {
  // 6 products from the server: prioritised stores first, topped up with the newest.
  const { data: products, loading, error, refresh } = useFeaturedProducts();
  const { t } = useTranslation();

  return (
    <section className="py-16 md:py-24 bg-background w-full" aria-labelledby="featured-products-heading">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div className="flex items-start gap-4 min-w-0">
          <span className="font-headline text-xs px-3 py-2 bg-foreground text-background shrink-0" aria-hidden="true">01</span>
          <div className="min-w-0">
            <h2 id="featured-products-heading" className="font-headline text-xl sm:text-2xl md:text-4xl [overflow-wrap:anywhere]">
              {t('featured.title')}
            </h2>
            <p className="mt-3 text-base text-muted-foreground max-w-xl">
              {t('featured.subtitle')}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild className="mt-0 shrink-0">
          <Link href="/products">
            {t('featured.viewAll')}
            <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))
        ) : error ? (
          <div className="col-span-full text-center" role="alert">
            <p className="font-bold">{t('catalog.error.productsTitle', "We couldn't load products right now.")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('catalog.error.desc', 'Please check your connection and try again.')}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refresh()}>
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              {t('catalog.error.retry', 'Try again')}
            </Button>
          </div>
        ) : products.length > 0 ? (
          products.map((product) => <ProductCard key={product.id} product={product} sizes={CARD_IMAGE_SIZES_3COL} />)
        ) : (
          <div className="col-span-full text-center text-muted-foreground">
            <p>{t('featured.empty')}</p>
            <Button asChild variant="link" className="mt-2">
              <Link href="/products">{t('featured.viewAll')}</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
