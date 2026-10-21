'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/hooks/use-wishlist';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from './language-provider';
import { cn } from '@/lib/utils';

type Props = {
  productId: string;
  className?: string;
  /** When true (inside a Link), call stopPropagation so the click doesn't navigate */
  insideLink?: boolean;
};

/**
 * Pixel-frame heart button — toggles a product's wishlist state.
 *
 * Optimistic UI via the shared hook, so all cards showing the same product
 * update simultaneously when toggled anywhere.
 */
export function WishlistButton({ productId, className, insideLink }: Props) {
  const { isWishlisted, toggle } = useWishlist();
  const { toast } = useToast();
  const { t } = useTranslation();
  const pathname = usePathname();
  const liked = isWishlisted(productId);
  const label = liked
    ? t('catalog.wishlist.remove', 'Remove from wishlist')
    : t('catalog.wishlist.add', 'Add to wishlist');

  const onClick = async (e: React.MouseEvent) => {
    if (insideLink) {
      e.preventDefault();
      e.stopPropagation();
    }
    const r = await toggle(productId);
    if (r.requiresLogin) {
      // Not an error: explain and offer the way in.
      toast({
        title: t('catalog.wishlist.loginTitle', 'Sign in to save favourites'),
        description: (
          <span>
            {t('catalog.wishlist.loginDesc', 'Your wishlist is kept in your account.')}{' '}
            <Link
              href={`/login?next=${encodeURIComponent(pathname || '/')}`}
              className="font-bold underline decoration-2 underline-offset-4"
            >
              {t('catalog.wishlist.loginCta', 'Log in')}
            </Link>
          </span>
        ),
      });
      return;
    }
    if (r.error) {
      toast({
        variant: 'destructive',
        title: t('catalog.wishlist.errorTitle', 'Could not save'),
        description: t('catalog.wishlist.errorDesc', 'Network error — please try again.'),
      });
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={liked}
      title={label}
      className={cn(
        'inline-flex items-center justify-center h-8 w-8 border-[2px] border-foreground bg-background',
        'shadow-[2px_2px_0_0_hsl(var(--foreground))]',
        'transition-transform [transition-timing-function:steps(2,end)] duration-75',
        'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_0_hsl(var(--foreground))]',
        'active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
        liked && 'bg-accent text-accent-foreground',
        className
      )}
    >
      <Heart
        className={cn('h-4 w-4', liked ? 'fill-foreground text-foreground' : 'text-foreground')}
        aria-hidden="true"
      />
    </button>
  );
}
