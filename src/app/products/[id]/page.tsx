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
import { useProducts } from '@/hooks/use-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTranslation } from '@/components/language-provider';
import { useSessionUser } from '@/hooks/use-session';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: products, loading } = useProducts();
  const { toast } = useToast();
  const { addToCart, getItemQuantity } = useCart();
  const { t } = useTranslation();
  const { user } = useSessionUser();
  
  const [quantity, setQuantity] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const product = products?.find((p) => p.id === id) || null;
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
              className="relative w-full max-w-[90vw] md:max-w-3xl mx-auto aspect-square px-5 sm:px-6"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="absolute inset-3 sm:inset-5 rounded-xl border bg-black/60" />
              <div className="absolute inset-3 sm:inset-5 rounded-xl overflow-hidden">
                <Image
                  src={activeImage || product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-contain"
                  data-ai-hint={product.imageHint}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-5 top-5 sm:left-7 sm:top-7 z-20 bg-background/80 hover:bg-background"
                asChild
              >
                <Link href="/products">
                  <X className="h-5 w-5" />
                  <span className="sr-only">{t('productDetail.close')}</span>
                </Link>
              </Button>
              {gallery.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-5 sm:left-7 top-1/2 -translate-y-1/2 z-20 bg-background/80 hover:bg-background"
                    onClick={goToPrev}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-5 sm:right-7 top-1/2 -translate-y-1/2 z-20 bg-background/80 hover:bg-background"
                    onClick={goToNext}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {gallery.map((img) => (
                  <button
                    key={img}
                    onClick={() => setActiveImage(img)}
                    className={cn(
                      'relative aspect-square rounded-md overflow-hidden border',
                      activeImage === img ? 'border-primary ring-2 ring-primary/50' : 'border-muted'
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
              {product.description || t('productDetail.noDescription')}
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
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-4xl font-bold">${product.price.toFixed(2)}</p>
              
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xl font-bold w-10 text-center">{quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantity(q => q + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="lg" onClick={handleAddToCart}>
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
