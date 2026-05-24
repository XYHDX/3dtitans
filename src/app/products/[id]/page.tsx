'use client';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Box, ShoppingCart, Plus, Minus, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { Badge } from '@/components/ui/badge';
import { useProduct } from '@/hooks/use-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTranslation } from '@/components/language-provider';
import { useSessionUser } from '@/hooks/use-session';
import { ProductReviews } from '@/components/product-reviews';

// eslint-disable-next-line
export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  // SECURITY: fetch ONLY the product being viewed. Previously this used
  // useProducts() which downloaded the entire catalog and filtered client-side
  // — leaking uploader IDs, prices, descriptions, and store info for every
  // product to anyone who clicked a single product card.
  const { data: product, loading } = useProduct(id);
  const { toast } = useToast();
  const { addToCart, getItemQuantity } = useCart();
  const { t } = useTranslation();
  const { user } = useSessionUser();
  const truncateWords = (value: string, limit: number) => {
    const words = value.trim().split(/\s+/);
    if (words.length <= limit) return value;
    return `${words.slice(0, limit).join(' ')}...`;
  };

  const [quantity, setQuantity] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // `product` already comes from useProduct(id) above — no client-side filter needed.
  const gallery = useMemo(
    () =>
      (product?.imageGallery && product.imageGallery.length > 0)
        ? product.imageGallery
        : product?.imageUrl
          ? [product.imageUrl]
          : [],
    [product?.imageGallery, product?.imageUrl]
  );
  const [activeImage, setActiveImage] = useState(gallery[0] || '');

  useEffect(() => {
    setActiveImage(gallery[0] || '');
  }, [gallery]);

  const handleAddToCart = () => {
    if (!product) return;
    if (!user) {
      toast({
        variant: 'destructive',
        title: t('auth.loginToBuyTitle'),
        description: t('auth.loginToBuyDesc'),
      });
      return;
    }
    if (user.role === 'store-owner') {
      toast({
        variant: 'destructive',
        title: t('auth.storeOwnerBlockedTitle'),
        description: t('auth.storeOwnerBlockedDesc'),
      });
      return;
    }

    addToCart(product, quantity);

    toast({
      title: t('productCard.addedTitle'),
      description: t('productCard.addedDescription', '', { name: `${quantity} x ${product.name}` }),
    });
    setQuantity(1); // Reset quantity after adding
  };

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return notFound();
  }

  const rating = product.rating || 4.5;
  const reviewCount = product.reviewCount || 117;
  const storeName = product.storeName || product.uploaderName || product.uploaderEmail || 'Store';
  const quantityInCart = getItemQuantity(product.id);
  const goToPrev = () => {
    if (!gallery.length) return;
    const idx = gallery.findIndex((g) => g === activeImage);
    const nextIdx = (idx - 1 + gallery.length) % gallery.length;
    setActiveImage(gallery[nextIdx]);
  };

  const goToNext = () => {
    if (!gallery.length) return;
    const idx = gallery.findIndex((g) => g === activeImage);
    const nextIdx = (idx + 1) % gallery.length;
    setActiveImage(gallery[nextIdx]);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0]?.clientX || null);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const delta = (e.changedTouches[0]?.clientX || 0) - touchStartX;
    if (Math.abs(delta) > 40) {
      if (delta > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
    setTouchStartX(null);
  };

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="flex flex-col gap-3">
            <div
              className="relative w-full max-w-[92vw] md:max-w-3xl mx-auto aspect-square"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Pixel-frame image stage — Recycled Tissue background to match brand */}
              <div
                className="absolute inset-3 sm:inset-6 border-[3px] border-foreground"
                style={{ background: 'hsl(var(--recycled-tissue))' }}
              />
              <div className="absolute inset-4 sm:inset-7 overflow-hidden">
                <Image
                  src={activeImage || product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-contain"
                  data-ai-hint={product.imageHint}
                />
              </div>
              <Badge variant="creator" className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
                {product.uploaderName || product.uploaderEmail || 'Store'}
              </Badge>

              {/* Close — pixel-frame button, back to /products */}
              <Link
                href="/products"
                aria-label={t('productDetail.close')}
                className="absolute left-6 top-6 sm:left-8 sm:top-8 z-20 inline-flex h-10 w-10 items-center justify-center border-[3px] border-foreground bg-background text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform [transition-timing-function:steps(2,end)] duration-75 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-accent hover:text-accent-foreground hover:shadow-[5px_5px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <X className="h-5 w-5" />
              </Link>

              {gallery.length > 1 && (
                <>
                  {/* Prev */}
                  <button
                    type="button"
                    onClick={goToPrev}
                    aria-label="Previous image"
                    className="absolute left-6 sm:left-8 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center border-[3px] border-foreground bg-background text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform [transition-timing-function:steps(2,end)] duration-75 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-accent hover:text-accent-foreground hover:shadow-[5px_5px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  {/* Next */}
                  <button
                    type="button"
                    onClick={goToNext}
                    aria-label="Next image"
                    className="absolute right-6 sm:right-8 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center border-[3px] border-foreground bg-background text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform [transition-timing-function:steps(2,end)] duration-75 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-accent hover:text-accent-foreground hover:shadow-[5px_5px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>

                  {/* Image counter */}
                  <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 border-[2px] border-foreground bg-background px-2 py-1 font-headline text-[10px] tracking-wider">
                    {gallery.findIndex((g) => g === activeImage) + 1} / {gallery.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails — pixel-frame, active state inverts to Arcade Yellow */}
            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-3 mt-4 px-4">
                {gallery.map((img) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    aria-label="View image"
                    aria-pressed={activeImage === img}
                    className={cn(
                      'relative aspect-square overflow-hidden border-[3px] border-foreground',
                      'transition-transform [transition-timing-function:steps(2,end)] duration-75',
                      activeImage === img
                        ? 'shadow-[4px_4px_0_0_hsl(var(--accent))] ring-[3px] ring-accent ring-offset-2 ring-offset-background'
                        : 'shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))]'
                    )}
                  >
                    <Image src={img} alt={product.name} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col p-8">
            <h1 className="font-headline text-4xl lg:text-5xl">{product.name}</h1>
            <p className="text-muted-foreground mt-2 text-lg">{product.category}</p>
            <div className="text-sm text-muted-foreground mt-2">
              {product.storeSlug ? (
                <>
                  Store:{' '}
                  <Link href={`/stores/${product.storeSlug}`} className="font-medium text-primary hover:underline">
                    {storeName}
                  </Link>
                </>
              ) : (
                <>By {storeName}</>
              )}
            </div>

            <div className="flex items-center mt-4">
              <div className="flex items-center text-accent">
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-muted stroke-accent" />
              </div>
              <span className="ml-2 text-muted-foreground text-sm">
                {t('productDetail.rating', '', { rating: rating.toFixed(1), count: reviewCount })}
              </span>
            </div>

            <Separator className="my-6" />

            <p className="text-muted-foreground text-base leading-relaxed">
              {product.description
                ? truncateWords(product.description, 20)
                : t('productDetail.noDescription')}
            </p>

            <p className="mt-3 text-sm font-semibold text-destructive">
              If you want to buy the STL file contact the store owner at {product.uploaderEmail || 'their email is not available'}.
            </p>

            {product.tags && product.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="font-semibold text-foreground text-sm">{t('productDetail.tags')}</span>
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}

            <div className="flex-grow" />

            <Separator className="my-6" />

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4">
              <p className="text-4xl font-bold">${product.price.toFixed(2)}</p>

              <div className="flex flex-wrap items-center gap-4 justify-start sm:justify-end">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Decrease quantity">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-bold w-10 text-center" aria-live="polite" aria-label={`Quantity ${quantity}`}>{quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantity(q => q + 1)} aria-label="Increase quantity">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="lg" className="min-w-[160px] justify-center flex-shrink-0" onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {t('productDetail.addToCart')}
                </Button>
              </div>

            </div>
            {quantityInCart > 0 && (
              <p className="text-sm text-center mt-4 text-muted-foreground">
                {t('productDetail.inCart', '', { count: quantityInCart })}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Phase 2 — reviews */}
      <ProductReviews productId={id} />
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <Card>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <Skeleton className="aspect-square rounded-l-lg" />
          <div className="flex flex-col p-8 space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-5 w-1/2" />
            <Separator className="my-2" />
            <Skeleton className="h-24 w-full" />
            <div className="flex-grow" />
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-12 w-1/3" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
