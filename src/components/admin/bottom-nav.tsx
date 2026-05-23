'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, UploadCloud, Mail, Settings, Users, Newspaper, ShoppingBag, LayoutDashboard, Component, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionUser } from '@/hooks/use-session';
import { useEffect, useMemo, useState } from 'react';
import { useOrders, useUploads } from '@/hooks/use-data';

const allNavItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Home', roles: ['admin'] },
  { href: '/store-dashboard', icon: Home, label: 'Store Home', roles: ['store-owner'] },
  { href: '/store-dashboard/profile', icon: User, label: 'Store Profile', roles: ['store-owner'] },
  { href: '/admin/products', icon: Package, label: 'Products', roles: ['admin', 'store-owner'] },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders', roles: ['admin', 'store-owner'] },
  { href: '/admin/pool', icon: Component, label: 'Pool', roles: ['admin', 'store-owner'] },
  { href: '/admin/uploads', icon: UploadCloud, label: 'Uploads', roles: ['admin'] },
  { href: '/store-dashboard/uploads', icon: UploadCloud, label: 'Uploads', roles: ['store-owner'] },
  { href: '/admin/contact', icon: Mail, label: 'Contact', roles: ['admin'] },
  { href: '/admin/users', icon: Users, label: 'Users', roles: ['admin'] },
  { href: '/admin/newsletter', icon: Newspaper, label: 'Newsletter', roles: ['admin'] },
  { href: '/admin/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  const { user } = useSessionUser();
  const { data: orders } = useOrders(
    user?.role === 'store-owner' && user?.id ? { ownerId: user.id } : undefined,
    user?.role === 'store-owner' ? undefined : { skipFetch: true }
  );
  const { data: uploads } = useUploads(
    user?.role === 'store-owner' ? undefined : { skipFetch: true }
  );
  const [lastViewed, setLastViewed] = useState<{ orders: number; uploads: number }>({ orders: 0, uploads: 0 });

  useEffect(() => {
    if (!user?.id || user.role !== 'store-owner') return;
    const o = Number(localStorage.getItem(`orders-viewed-${user.id}`) || 0);
    const u = Number(localStorage.getItem(`uploads-viewed-${user.id}`) || 0);
    setLastViewed({ orders: o, uploads: u });
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id || user.role !== 'store-owner') return;
    if (pathname.startsWith('/admin/orders')) {
      const now = Date.now();
      localStorage.setItem(`orders-viewed-${user.id}`, String(now));
      setLastViewed((prev) => ({ ...prev, orders: now }));
    }
    if (pathname.startsWith('/store-dashboard/uploads')) {
      const now = Date.now();
      localStorage.setItem(`uploads-viewed-${user.id}`, String(now));
      setLastViewed((prev) => ({ ...prev, uploads: now }));
    }
  }, [pathname, user?.id, user?.role]);

  const hasNewOrders = useMemo(() => {
    if (!orders || !orders.length || user?.role !== 'store-owner') return false;
    const latest = Math.max(
      ...orders.map((o) => new Date((o as any).updatedAt || (o as any).orderDate || Date.now()).getTime())
    );
    return latest > lastViewed.orders;
  }, [orders, lastViewed.orders, user?.role]);

  const hasNewUploads = useMemo(() => {
    if (!uploads || !uploads.length || user?.role !== 'store-owner') return false;
    const latest = Math.max(
      ...uploads.map((u) => new Date((u as any).updatedAt || (u as any).createdAt || Date.now()).getTime())
    );
    return latest > lastViewed.uploads;
  }, [uploads, lastViewed.uploads, user?.role]);
  
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
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {user?.role === 'store-owner' && item.href === '/admin/orders' && hasNewOrders && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
              {user?.role === 'store-owner' && item.href === '/store-dashboard/uploads' && hasNewUploads && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </div>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
