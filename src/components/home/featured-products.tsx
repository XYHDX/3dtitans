
'use client';
import Link from 'next/link';
import { Button } from '../ui/button';
import { ProductCard } from '../product-card';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useProducts } from '@/hooks/use-data';
import { useTranslation } from '../language-provider';

export function FeaturedProducts() {
  const { data: allProducts, loading } = useProducts();
  const prioritizedProducts = allProducts?.filter((p) => p.isPrioritizedStore) || [];
  const products = prioritizedProducts.slice(0, 6);
  const { t } = useTranslation();

  return (
    <section className="py-16 md:py-24 bg-background w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
        <div>
          <h2 className="font-headline text-4xl md:text-5xl tracking-wide">{t('featured.title')}</h2>
          <p className="mt-2 text-lg text-muted-foreground max-w-xl">
            {t('featured.subtitle')}
          </p>
        </div>
        <Button variant="ghost" asChild className="mt-4 md:mt-0">
          <Link href="/products">
            {t('featured.viewAll')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {loading ? (
           Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))
        ) : products && products.length > 0 ? (
          products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product}
            />
          ))
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
