
'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { Menu, ShoppingCart, LogOut, LayoutDashboard, ClipboardList, Heart, MapPin } from 'lucide-react';
import { Logo } from './logo';
import { useMemo, useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { CartSheet } from './cart-sheet';
import { Badge } from './ui/badge';
import { useLogin, useSessionUser } from '@/hooks/use-session';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from './ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useTranslation } from './language-provider';
import { LanguageToggle } from './language-toggle';
import { ThemeToggle } from './theme-toggle';
import { SiteSearch } from './site-search';
import { cn } from '@/lib/utils';

export function Header() {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  const { cart } = useCart();
  const { user } = useSessionUser();
  const { logout } = useLogin();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isRTL = locale === 'ar';
  const navLinks = useMemo(
    () => {
      const links = [
        { href: '/products', label: t('nav.products') },
        { href: '/stores', label: t('nav.stores') },
        { href: '/upload', label: t('nav.upload') },
        { href: '/about', label: t('nav.about') },
      ];
      if (user?.role === 'store-owner') {
        return links.filter((link) => link.href !== '/upload');
      }
      return links;
    },
    [t, user?.role]
  );

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const getInitials = (name: string | null | undefined, email?: string | null) => {
    const source = name || email;
    if (!source) return 'U';
    return source.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  }
  
  const authContent = user ? (
    <div className="flex items-center gap-2">
      <ThemeToggle className="hidden md:inline-flex" />
      {user.role !== 'store-owner' && (
        <Button variant="ghost" size="icon" onClick={() => setCartOpen(true)} className="relative">
          <ShoppingCart className="h-5 w-5" />
          {cartItemCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-2 h-5 w-5 justify-center p-0">{cartItemCount}</Badge>
          )}
          <span className="sr-only">{t('nav.openCart')}</span>
        </Button>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
             <Avatar className="h-10 w-10">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
              <AvatarFallback>{getInitials(user.displayName, user.email)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(user.role === 'admin') && (
            <DropdownMenuItem asChild>
              <Link href="/admin/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {t('nav.admin')}
              </Link>
            </DropdownMenuItem>
          )}
          {user.role !== 'store-owner' && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/orders">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  My Orders
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/wishlist">
                  <Heart className="mr-2 h-4 w-4" />
                  My Wishlist
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/addresses">
                  <MapPin className="mr-2 h-4 w-4" />
                  Saved Addresses
                </Link>
              </DropdownMenuItem>
            </>
          )}
          {(user.role === 'store-owner') && (
             <DropdownMenuItem asChild>
              <Link href="/store-dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {t('nav.store')}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('nav.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

     </div>
  ) : (
     <div className="flex items-center gap-2">
      <ThemeToggle className="hidden md:inline-flex" />
      <LanguageToggle />
      <Button asChild className="hidden md:inline-flex">
        <Link href="/login">{t('nav.login')} / {t('nav.signup')}</Link>
      </Button>
     </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b-[3px] border-foreground bg-background">
      {/* Brand strip — slogan + accent line */}
      <div className="bg-accent text-accent-foreground border-b-[2px] border-foreground">
        <div className="container mx-auto flex h-7 items-center justify-center px-4 sm:px-6 lg:px-8 text-[10px] font-headline tracking-wider">
          Build Worlds, Create Legends. — A 3D Model Marketplace.
        </div>
      </div>
      <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center flex-1 md:flex-initial order-1">
          {/* Mobile Menu */}
          <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={isRTL ? 'right' : 'left'}>
              <SheetHeader>
                <SheetTitle className="sr-only">Menu</SheetTitle>
              </SheetHeader>
              <Link href="/" className="mb-8 inline-flex items-center" onClick={() => setSheetOpen(false)}>
                <Logo width={200} height={44} />
              </Link>
              <nav className="flex flex-col gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSheetOpen(false)}
                    className="text-lg font-semibold hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Authenticated quick links */}
              {user && user.role !== 'store-owner' && (
                <nav className="flex flex-col gap-4 mt-6 pt-6 border-t-[2px] border-foreground/20 text-sm">
                  <Link href="/orders" onClick={() => setSheetOpen(false)} className="flex items-center gap-2 hover:text-accent-foreground hover:bg-accent px-1 py-1">
                    <ClipboardList className="h-4 w-4" /> My Orders
                  </Link>
                  <Link href="/wishlist" onClick={() => setSheetOpen(false)} className="flex items-center gap-2 hover:text-accent-foreground hover:bg-accent px-1 py-1">
                    <Heart className="h-4 w-4" /> My Wishlist
                  </Link>
                  <Link href="/account/addresses" onClick={() => setSheetOpen(false)} className="flex items-center gap-2 hover:text-accent-foreground hover:bg-accent px-1 py-1">
                    <MapPin className="h-4 w-4" /> Saved Addresses
                  </Link>
                </nav>
              )}

              <div className="mt-6 flex flex-col gap-3 pt-6 border-t-[2px] border-foreground/20">
                {!user && (
                  <Button asChild className="w-full">
                    <Link href="/login" onClick={() => setSheetOpen(false)}>
                      {t('nav.login')} / {t('nav.signup')}
                    </Link>
                  </Button>
                )}
                {/* Theme toggle — lives in the sheet for mobile users.
                    Forced visible here regardless of viewport since the sheet itself only opens on mobile. */}
                <div className="flex items-center justify-between gap-3 mt-2">
                  <span className="text-xs font-headline uppercase tracking-wider">Theme</span>
                  <ThemeToggle className="inline-flex" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-headline uppercase tracking-wider">Language</span>
                  <LanguageToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Logo */}
          <Link
            href="/"
            className={cn(
              'hidden md:flex items-center',
              isRTL ? 'ml-4' : 'mr-4'
            )}
          >
            <Logo width={200} height={44} />
          </Link>
        </div>

        {/* Desktop Search / Mobile Logo */}
        <div className="flex flex-1 justify-center md:justify-center order-2 min-w-0 px-2">
          {/* Mobile Logo */}
          <Link href="/" className="flex items-center md:hidden">
            <Logo width={160} height={36} />
          </Link>
          {/* Desktop Search bar — centered between logo and auth */}
          <div className="hidden md:flex flex-1 max-w-md justify-center">
            <SiteSearch className="w-full" />
          </div>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center justify-end flex-1 md:flex-initial gap-2 order-3">
          {user && (
            <div className="hidden md:flex">
              <LanguageToggle />
            </div>
          )}
          {authContent}
        </div>

        <CartSheet open={isCartOpen} onOpenChange={setCartOpen} />
      </div>

      {/* Secondary nav row — visible on desktop only (mobile uses the sheet menu) */}
      <div className="hidden md:block border-t-[2px] border-foreground bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wide">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border-[2px] border-transparent px-3 py-1 hover:border-foreground hover:bg-accent hover:text-accent-foreground transition-transform [transition-timing-function:steps(2,end)] duration-75 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
