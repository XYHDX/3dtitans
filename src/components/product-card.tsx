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
    <Card className="overflow-hidden flex flex-col group h-full transition-all hover:shadow-primary/20 hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="p-0 relative">
        <Link href={`/products/${product.id}`} className="block aspect-[4/3]">
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            data-ai-hint={product.imageHint}
          />
        </Link>
        <Badge variant="secondary" className="absolute top-3 right-3">
          {storeHref ? (
            <Link href={storeHref} className="hover:underline">
              {storeName}
            </Link>
          ) : (
            storeName
          )}
        </Badge>
        {product.has3dPreview && (
          <Badge variant="secondary" className="absolute top-3 left-3">
            <Box className="h-3 w-3 mr-1.5" />
            {t('productCard.preview')}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <p className="text-sm text-muted-foreground">{product.category}</p>
        <h3 className="font-semibold mt-1">
          <Link href={`/products/${product.id}`} className="hover:text-primary transition-colors">
            {product.name}
          </Link>
        </h3>
        <div className="flex items-center mt-2 text-sm text-muted-foreground">
          <Star className="h-4 w-4 mr-1 text-accent fill-accent" />
          <span>{rating.toFixed(1)}</span>
          <span className="mx-1">·</span>
          <span>{t('productCard.reviews', '', { count: reviewCount })}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex justify-between items-center w-full">
            <p className="text-lg font-semibold">${product.price.toFixed(2)}</p>
            <Button variant="outline" size="icon" onClick={handleAddToCart}>
                <ShoppingCart className="h-4 w-4" />
                <span className="sr-only">{t('productCard.addSr')}</span>
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
