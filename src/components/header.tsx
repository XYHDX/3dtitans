
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
import { Menu, ShoppingCart, LogOut, LogIn, LayoutDashboard, ClipboardList, Heart, MapPin } from 'lucide-react';
import { Logo } from './logo';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { CartSheet } from './cart-sheet';
import { Badge } from './ui/badge';
import { useLogin, useSessionUser } from '@/hooks/use-session';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from './ui/dropdown-menu';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from './language-provider';
import { LanguageToggle } from './language-toggle';
import { ThemeToggle } from './theme-toggle';
import { SiteSearch } from './site-search';

export function Header() {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  const { cart } = useCart();
  const { user } = useSessionUser();
  const { logout } = useLogin();
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const isRTL = locale === 'ar';

  // Close the mobile menu whenever the page changes (e.g. after a search).
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);
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

  // The guest cart is restored from localStorage on the client only; show the
  // count after mount so the server and first client render match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const cartItemCount = mounted ? cart.reduce((acc, item) => acc + item.quantity, 0) : 0;

  // Send visitors back to the page they were on after logging in.
  const loginHref =
    pathname && pathname !== '/' && !/^\/(login|signup|forgot-password|reset-password)/.test(pathname)
      ? `/login?next=${encodeURIComponent(pathname)}`
      : '/login';

  const getInitials = (name: string | null | undefined, email?: string | null) => {
    const source = name || email;
    if (!source) return 'U';
    return source.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  }
  
  // Guests can shop too (the cart lives in localStorage and merges on login);
  // only store-owner accounts can't buy.
  const cartButton = user?.role !== 'store-owner' && (
    <Button variant="ghost" size="icon" onClick={() => setCartOpen(true)} className="relative">
      <ShoppingCart className="h-5 w-5" />
      {cartItemCount > 0 && (
        <Badge variant="destructive" className="absolute -top-1 -end-2 h-5 w-5 justify-center p-0">{cartItemCount}</Badge>
      )}
      <span className="sr-only">
        {t('nav.openCart')}
        {cartItemCount > 0 ? ` (${t('header.cartCount', '{count} items', { count: cartItemCount })})` : ''}
      </span>
    </Button>
  );

  const authContent = user ? (
    <div className="flex items-center gap-2">
      <ThemeToggle className="hidden lg:inline-flex" />
      {cartButton}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full"
            aria-label={t('header.accountMenu', 'Account menu for {name}', { name: user.displayName || user.email })}
          >
             <Avatar className="h-10 w-10">
              <AvatarImage src={user.photoURL || undefined} alt="" />
              <AvatarFallback aria-hidden="true">{getInitials(user.displayName, user.email)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.displayName || t('header.userFallback', 'User')}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(user.role === 'admin') && (
            <DropdownMenuItem asChild>
              <Link href="/admin/dashboard">
                <LayoutDashboard className="me-2 h-4 w-4" />
                {t('nav.admin')}
              </Link>
            </DropdownMenuItem>
          )}
          {user.role !== 'store-owner' && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/orders">
                  <ClipboardList className="me-2 h-4 w-4" />
                  {t('header.myOrders', 'My orders')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/wishlist">
                  <Heart className="me-2 h-4 w-4" />
                  {t('header.myWishlist', 'My wishlist')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/addresses">
                  <MapPin className="me-2 h-4 w-4" />
                  {t('header.savedAddresses', 'Saved addresses')}
                </Link>
              </DropdownMenuItem>
            </>
          )}
          {(user.role === 'store-owner') && (
             <DropdownMenuItem asChild>
              <Link href="/store-dashboard">
                <LayoutDashboard className="me-2 h-4 w-4" />
                {t('nav.store')}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="me-2 h-4 w-4" />
            <span>{t('nav.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

     </div>
  ) : (
     <div className="flex items-center gap-2">
      <ThemeToggle className="hidden lg:inline-flex" />
      {/* Language lives in the menu on phones (no room next to cart + login). */}
      <div className="hidden lg:flex">
        <LanguageToggle />
      </div>
      {cartButton}
      {/* Phones: compact login icon. Desktop: full "Login / Sign up" button. */}
      <Button asChild variant="ghost" size="icon" className="lg:hidden">
        <Link href={loginHref} aria-label={t('nav.login')}>
          <LogIn className="h-5 w-5 rtl:rotate-180" />
        </Link>
      </Button>
      <Button asChild className="hidden lg:inline-flex">
        <Link href={loginHref}>{t('nav.login')} / {t('nav.signup')}</Link>
      </Button>
     </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b-[3px] border-foreground bg-background">
      {/* Brand strip — slogan + accent line */}
      <div className="bg-accent text-accent-foreground border-b-[2px] border-foreground">
        <div className="container mx-auto flex h-7 items-center justify-center px-4 sm:px-6 lg:px-8 text-[10px] font-headline tracking-wider">
          {t('header.tagline', 'Build worlds, create legends.')}
        </div>
      </div>
      <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center flex-1 lg:flex-initial order-1">
          {/* Mobile Menu */}
          <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('header.openMenu', 'Open menu')} className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={isRTL ? 'right' : 'left'}>
              <SheetHeader>
                <SheetTitle className="sr-only">{t('header.menu', 'Menu')}</SheetTitle>
              </SheetHeader>
              <Link href="/" className="mb-6 inline-flex items-center" onClick={() => setSheetOpen(false)}>
                <Logo width={200} height={44} />
              </Link>
              {/* Mobile search — closes the menu as soon as a search or result is chosen. */}
              <div
                className="mb-6"
                onSubmitCapture={() => setSheetOpen(false)}
                onKeyDownCapture={(e) => {
                  if (e.key === 'Enter') setSheetOpen(false);
                }}
                onClickCapture={(e) => {
                  if ((e.target as HTMLElement).closest('a')) setSheetOpen(false);
                }}
              >
                <SiteSearch className="w-full max-w-none" />
              </div>
              <nav className="flex flex-col gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSheetOpen(false)}
                    className="text-lg font-semibold px-1 hover:bg-accent hover:text-accent-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Authenticated quick links */}
              {user && user.role !== 'store-owner' && (
                <nav className="flex flex-col gap-4 mt-6 pt-6 border-t-[2px] border-foreground/20 text-sm">
                  <Link href="/orders" onClick={() => setSheetOpen(false)} className="flex items-center gap-2 hover:text-accent-foreground hover:bg-accent px-1 py-1">
                    <ClipboardList className="h-4 w-4" /> {t('header.myOrders', 'My orders')}
                  </Link>
                  <Link href="/wishlist" onClick={() => setSheetOpen(false)} className="flex items-center gap-2 hover:text-accent-foreground hover:bg-accent px-1 py-1">
                    <Heart className="h-4 w-4" /> {t('header.myWishlist', 'My wishlist')}
                  </Link>
                  <Link href="/account/addresses" onClick={() => setSheetOpen(false)} className="flex items-center gap-2 hover:text-accent-foreground hover:bg-accent px-1 py-1">
                    <MapPin className="h-4 w-4" /> {t('header.savedAddresses', 'Saved addresses')}
                  </Link>
                </nav>
              )}

              <div className="mt-6 flex flex-col gap-3 pt-6 border-t-[2px] border-foreground/20">
                {!user && (
                  <Button asChild className="w-full">
                    <Link href={loginHref} onClick={() => setSheetOpen(false)}>
                      {t('nav.login')} / {t('nav.signup')}
                    </Link>
                  </Button>
                )}
                {/* Theme toggle — lives in the sheet for mobile users.
                    Forced visible here regardless of viewport since the sheet itself only opens on mobile. */}
                <div className="flex items-center justify-between gap-3 mt-2">
                  <span className="text-xs font-headline uppercase tracking-wider">{t('header.theme', 'Theme')}</span>
                  <ThemeToggle className="inline-flex" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-headline uppercase tracking-wider">{t('header.language', 'Language')}</span>
                  <LanguageToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Logo */}
          <Link
            href="/"
            className="hidden lg:flex items-center me-4"
            aria-label={t('header.home', '3D Titans home')}
          >
            <Logo width={200} height={44} />
          </Link>
        </div>

        {/* Desktop Search / Mobile Logo */}
        <div className="flex flex-1 justify-center lg:justify-center order-2 min-w-0 px-2">
          {/* Mobile Logo */}
          <Link href="/" className="flex items-center lg:hidden" aria-label={t('header.home', '3D Titans home')}>
            <Logo width={160} height={36} />
          </Link>
          {/* Desktop Search bar — centered between logo and auth */}
          <div className="hidden lg:flex flex-1 max-w-md justify-center">
            <SiteSearch className="w-full" />
          </div>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center justify-end flex-1 lg:flex-initial gap-2 order-3">
          {user && (
            <div className="hidden lg:flex">
              <LanguageToggle />
            </div>
          )}
          {authContent}
        </div>

        {user?.role !== 'store-owner' && <CartSheet open={isCartOpen} onOpenChange={setCartOpen} />}
      </div>

      {/* Secondary nav row — visible on desktop only (mobile uses the sheet menu) */}
      <div className="hidden lg:block border-t-[2px] border-foreground bg-background">
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
