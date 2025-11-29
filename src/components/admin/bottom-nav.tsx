'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, UploadCloud, Mail, Settings, Users, Newspaper, ShoppingBag, LayoutDashboard, Component, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionUser } from '@/hooks/use-session';

const allNavItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Home', roles: ['admin'] },
  { href: '/store-dashboard', icon: Home, label: 'Store Home', roles: ['store-owner'] },
  { href: '/admin/products', icon: Package, label: 'Products', roles: ['admin', 'store-owner'] },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders', roles: ['admin', 'store-owner'] },
  { href: '/admin/pool', icon: Component, label: 'Pool', roles: ['admin', 'store-owner'] },
  { href: '/admin/uploads', icon: UploadCloud, label: 'Uploads', roles: ['admin'] },
  { href: '/admin/contact', icon: Mail, label: 'Contact', roles: ['admin'] },
  { href: '/admin/users', icon: Users, label: 'Users', roles: ['admin'] },
  { href: '/admin/newsletter', icon: Newspaper, label: 'Newsletter', roles: ['admin'] },
  { href: '/admin/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  const { user } = useSessionUser();
  
  const navItems = user
    ? allNavItems.filter(item => user.role && item.roles.includes(user.role))
    : [];

  if (!user || navItems.length === 0) {
    // Render an empty placeholder to prevent layout shift and hide nav from unauthorized users.
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t h-16" />
    );
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t h-16 grid"
      style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors w-full h-full',
              isActive ? 'text-primary bg-muted/50' : 'hover:bg-muted/50'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
