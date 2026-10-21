'use client';

import { useCurrency } from '@/hooks/use-currency';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Star, Box, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from './language-provider';
import { useSessionUser } from '@/hooks/use-session';
import { WishlistButton } from './wishlist-button';

/** Local branded placeholder for products without a photo. */
export const PRODUCT_FALLBACK_IMAGE = '/images/product-fallback.svg';

/** Card image widths for the 1 / 2 / 4 column product grid (pass `sizes` for other grids). */
const CARD_IMAGE_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw';
/** For grids that top out at 3 columns. */
export const CARD_IMAGE_SIZES_3COL = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

interface ProductCardProps {
  product: Product;
  /** Load the image eagerly (first row of a grid that is visible on load). */
  priority?: boolean;
  /** `sizes` for the card image; defaults to a 1 / 2 / 4 column grid. */
  sizes?: string;
}

export function ProductCard({ product, priority = false, sizes = CARD_IMAGE_SIZES }: ProductCardProps) {
  const { format: formatPrice } = useCurrency();
  // Real data only — no fake fallbacks. New products show 0 ratings honestly.
  const rating = product.rating ?? 0;
  const reviewCount = product.reviewCount ?? 0;
  const hasReviews = reviewCount > 0;
  const primaryImage = product.imageGallery?.[0] || product.imageUrl || PRODUCT_FALLBACK_IMAGE;
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useSessionUser();
  const storeName = product.storeName || product.uploaderName || product.uploaderEmail || t('catalog.store.fallbackName', 'Store');
  const storeHref = product.storeSlug ? `/stores/${product.storeSlug}` : null;

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Guests can shop freely (the cart lives in this browser and merges on
    // login); only store-owner accounts are blocked from buying.
    if (user?.role === 'store-owner') {
      toast({
        variant: 'destructive',
        title: t('auth.storeOwnerBlockedTitle'),
        description: t('auth.storeOwnerBlockedDesc'),
      });
      return;
    }
    addToCart(product, 1);
    toast({
      title: t('productCard.addedTitle'),
      description: t('productCard.addedDescription', '', { name: product.name }),
    });
  };

  return (
    <Card className="overflow-hidden flex flex-col group h-full transition-transform [transition-timing-function:steps(2,end)] duration-75 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[9px_9px_0_0_hsl(var(--foreground))] dark:hover:shadow-[9px_9px_0_0_hsl(var(--accent))]">
      <CardHeader className="p-0 relative border-b-[3px] border-foreground">
        <Link
          href={`/products/${product.id}`}
          className="relative block aspect-[4/3] bg-[hsl(var(--recycled-tissue))]"
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image
            src={primaryImage}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover"
            data-ai-hint={product.imageHint}
          />
        </Link>
        <Badge variant="creator" className="absolute top-2 end-2 max-w-[60%]">
          {storeHref ? (
            <Link href={storeHref} className="truncate hover:underline">
              {storeName}
            </Link>
          ) : (
            <span className="truncate">{storeName}</span>
          )}
        </Badge>
        {product.has3dPreview && (
          <Badge variant="verified" className="absolute top-2 start-2">
            <Box className="h-3 w-3 me-1" />
            {t('productCard.preview')}
          </Badge>
        )}
        <WishlistButton productId={product.id} insideLink className="absolute bottom-2 start-2" />
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <p className="text-xs font-headline uppercase tracking-wider text-muted-foreground [overflow-wrap:anywhere]">
          {product.category}
        </p>
        <h3 className="font-headline text-sm mt-2 leading-snug [overflow-wrap:anywhere]">
          <Link href={`/products/${product.id}`} className="hover:text-accent-foreground hover:bg-accent transition-colors">
            {product.name}
          </Link>
        </h3>
        <div className="flex items-center mt-3 text-xs text-muted-foreground">
          {hasReviews ? (
            <>
              <Star className="h-3.5 w-3.5 me-1 text-accent fill-accent" aria-hidden="true" />
              <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{t('productCard.reviews', '', { count: reviewCount })}</span>
            </>
          ) : (
            <span className="italic">{t('productDetail.noReviews', 'No reviews yet')}</span>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex flex-wrap justify-between items-center gap-2 w-full">
          <p className="font-headline text-base">{formatPrice(product.price)}</p>
          <Button
            variant="default"
            size="sm"
            onClick={handleAddToCart}
            aria-label={t('catalog.card.addNamed', 'Add {name} to cart', { name: product.name })}
          >
            <ShoppingCart className="h-4 w-4 me-1" aria-hidden="true" />
            {t('productCard.addSr')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
