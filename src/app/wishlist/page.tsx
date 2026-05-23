'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useSessionUser } from '@/hooks/use-session';
import { useWishlist } from '@/hooks/use-wishlist';
import type { Product } from '@/lib/types';

export default function WishlistPage() {
  const { user } = useSessionUser();
  const { refresh } = useWishlist();
  const [items, setItems] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/wishlist');
        const data = await res.json();
        if (!cancelled) setItems(data.items || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (user) load();
    else {
      setItems([]);
      setLoading(false);
    }
    return () => { cancelled = true; };
    // refresh() exposed by the shared hook re-loads after any toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Re-sync local list when shared wishlist store changes (e.g. remove via heart)
  useEffect(() => {
    // Cheap: re-fetch on focus
    function onFocus() {
      if (user) refresh();
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, refresh]);

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4 mb-10">
        <span className="font-headline text-xs px-3 py-2 bg-foreground text-background">WL</span>
        <div>
          <h1 className="font-headline text-3xl md:text-4xl">My Wishlist</h1>
          <p className="text-muted-foreground mt-2 text-sm">Models you saved for later.</p>
        </div>
      </div>

      {!user ? (
        <div className="border-[3px] border-dashed border-foreground/30 p-10 text-center">
          <Heart className="h-10 w-10 mx-auto mb-3 text-foreground/40" />
          <p className="mb-4 text-sm">Sign in to view and save your wishlist.</p>
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="border-[3px] border-dashed border-foreground/30 p-10 text-center">
          <Heart className="h-10 w-10 mx-auto mb-3 text-foreground/40" />
          <p className="mb-4 text-sm">Your wishlist is empty. Tap the heart on any model to save it.</p>
          <Button asChild>
            <Link href="/products">Browse models</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
