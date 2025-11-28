
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
import { Menu, ShoppingCart, LogOut, User as UserIcon, LayoutDashboard } from 'lucide-react';
import { Logo } from './logo';
import { useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { CartSheet } from './cart-sheet';
import { Badge } from './ui/badge';
import { useLogin, useSessionUser } from '@/hooks/use-session';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from './ui/dropdown-menu';
import { useRouter } from 'next/navigation';


const navLinks = [
  { href: '/products', label: 'Products' },
  { href: '/upload', label: 'Upload' },
  { href: '/about', label: 'About' },
];

export function Header() {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  const { cart } = useCart();
  const { user } = useSessionUser();
  const { logout } = useLogin();
  const router = useRouter();

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
      <Button variant="ghost" size="icon" onClick={() => setCartOpen(true)} className="relative">
        <ShoppingCart className="h-5 w-5" />
        {cartItemCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-2 h-5 w-5 justify-center p-0">{cartItemCount}</Badge>
        )}
        <span className="sr-only">Open Cart</span>
      </Button>
      
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
                Admin Dashboard
              </Link>
            </DropdownMenuItem>
          )}
          {(user.role === 'store-owner') && (
             <DropdownMenuItem asChild>
              <Link href="/store-dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Store Dashboard
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

     </div>
  ) : (
     <div className="flex items-center gap-2">
       <Button variant="ghost" size="icon" onClick={() => setCartOpen(true)} className="relative">
        <ShoppingCart className="h-5 w-5" />
        {cartItemCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-2 h-5 w-5 justify-center p-0">{cartItemCount}</Badge>
        )}
        <span className="sr-only">Open Cart</span>
      </Button>
      <Button variant="ghost" asChild>
        <Link href="/login">Login</Link>
      </Button>
      <Button asChild>
          <Link href="/signup">Sign Up</Link>
      </Button>
     </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center justify-start flex-1 md:flex-initial">
            {/* Mobile Menu */}
            <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden">
                    <Menu className="h-5 w-5" />
                </Button>
                </SheetTrigger>
                <SheetContent side="left">
                <SheetHeader>
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                </SheetHeader>
                <Link href="/" className="mb-8 inline-block" onClick={() => setSheetOpen(false)}>
                    <Logo />
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
                </SheetContent>
            </Sheet>

            {/* Desktop Logo */}
            <Link href="/" className="hidden md:flex items-center space-x-2">
              <Logo />
            </Link>
        </div>

        {/* Desktop Nav / Mobile Logo */}
        <div className="flex flex-1 justify-center md:justify-center">
            {/* Mobile Logo */}
            <Link href="/" className="flex items-center md:hidden">
                <Logo />
            </Link>
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center justify-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
                <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                {link.label}
                </Link>
            ))}
            </nav>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center justify-end flex-1 md:flex-initial">
          {authContent}
        </div>
        
        <CartSheet open={isCartOpen} onOpenChange={setCartOpen} />
      </div>
    </header>
  );
}
