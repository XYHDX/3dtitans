'use client';

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

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const rating = product.rating || 4.5;
  const reviewCount = product.reviewCount || Math.floor(Math.random() * 200) + 1;
  const primaryImage = product.imageGallery?.[0] || product.imageUrl || 'https://placehold.co/600x400';
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useSessionUser();
  const storeName = product.storeName || product.uploaderName || product.uploaderEmail || 'Store';
  const storeHref = product.storeSlug ? `/stores/${product.storeSlug}` : null;

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
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
    addToCart(product, 1);
    toast({
      title: t('productCard.addedTitle'),
      description: t('productCard.addedDescription', '', { name: product.name }),
    });
  };

  return (
    <Card className="overflow-hidden flex flex-col group h-full transition-transform [transition-timing-function:steps(2,end)] duration-75 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[9px_9px_0_0_hsl(var(--foreground))] dark:hover:shadow-[9px_9px_0_0_hsl(var(--accent))]">
      <CardHeader className="p-0 relative border-b-[3px] border-foreground">
        <Link href={`/products/${product.id}`} className="block aspect-[4/3] bg-[hsl(var(--recycled-tissue))]">
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover"
            data-ai-hint={product.imageHint}
          />
        </Link>
        <Badge variant="creator" className="absolute top-2 right-2">
          {storeHref ? (
            <Link href={storeHref} className="hover:underline">
              {storeName}
            </Link>
          ) : (
            storeName
          )}
        </Badge>
        {product.has3dPreview && (
          <Badge variant="verified" className="absolute top-2 left-2">
            <Box className="h-3 w-3 mr-1" />
            {t('productCard.preview')}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <p className="text-[10px] font-headline uppercase tracking-wider text-muted-foreground">{product.category}</p>
        <h3 className="font-headline text-sm mt-2 leading-snug">
          <Link href={`/products/${product.id}`} className="hover:text-accent-foreground hover:bg-accent transition-colors">
            {product.name}
          </Link>
        </h3>
        <div className="flex items-center mt-3 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 mr-1 text-accent fill-accent" />
          <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
          <span className="mx-1.5">·</span>
          <span>{t('productCard.reviews', '', { count: reviewCount })}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex justify-between items-center w-full">
            <p className="font-headline text-base">${product.price.toFixed(2)}</p>
            <Button variant="default" size="sm" onClick={handleAddToCart}>
                <ShoppingCart className="h-4 w-4 mr-1" />
                {t('productCard.addSr')}
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
