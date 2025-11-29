'use client';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Box, ShoppingCart, CheckCircle, Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/use-data';
import { cn } from '@/lib/utils';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: products, loading } = useProducts();
  const { toast } = useToast();
  const { addToCart, getItemQuantity, updateQuantity } = useCart();
  
  const [quantity, setQuantity] = useState(1);

  const product = products?.find((p) => p.id === id) || null;
  const gallery = (product?.imageGallery && product.imageGallery.length > 0)
    ? product.imageGallery
    : product?.imageUrl ? [product.imageUrl] : [];
  const [activeImage, setActiveImage] = useState(gallery[0] || '');

  const handleAddToCart = () => {
    if (!product) return;

    addToCart(product, quantity);
    
    toast({
      title: "Added to Cart!",
      description: `${quantity} x ${product.name} added to your cart.`,
    });
    setQuantity(1); // Reset quantity after adding
  };
  
  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return notFound();
  }

  const quantityInCart = getItemQuantity(product.id);

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <Card>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
              <Image
                src={activeImage || product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                data-ai-hint={product.imageHint}
              />
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
              <span className="ml-2 text-muted-foreground text-sm">4.5 (117 reviews)</span>
            </div>

            <Separator className="my-6" />

            <p className="text-muted-foreground text-base leading-relaxed">
              {product.description || 'No description provided.'}
            </p>
            
            {product.tags && product.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="font-semibold text-foreground text-sm">Tags:</span> 
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
                    Add to Cart
                  </Button>
              </div>

            </div>
             {quantityInCart > 0 && (
                <p className="text-sm text-center mt-4 text-muted-foreground">
                  You have {quantityInCart} of this item in your cart.
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
