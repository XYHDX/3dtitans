'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, UploadCloud, Mail, Settings, Users, Newspaper, ShoppingBag, LayoutDashboard, Component, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionUser } from '@/hooks/use-session';
import { useEffect, useMemo, useState } from 'react';
import { useOrders, useUploads } from '@/hooks/use-data';
import { useTranslation } from '@/components/language-provider';

const allNavItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Home', key: 'adminNav.adminHome', roles: ['admin'] },
  { href: '/store-dashboard', icon: Home, label: 'Store Home', key: 'adminNav.storeHome', roles: ['store-owner'] },
  { href: '/store-dashboard/profile', icon: User, label: 'Store Profile', key: 'adminNav.storeProfile', roles: ['store-owner'] },
  { href: '/admin/products', icon: Package, label: 'Products', key: 'adminNav.products', roles: ['admin', 'store-owner'] },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders', key: 'adminNav.orders', roles: ['admin', 'store-owner'] },
  { href: '/admin/pool', icon: Component, label: 'Pool', key: 'adminNav.pool', roles: ['admin', 'store-owner'] },
  { href: '/admin/uploads', icon: UploadCloud, label: 'Uploads', key: 'adminNav.uploads', roles: ['admin'] },
  { href: '/store-dashboard/uploads', icon: UploadCloud, label: 'Uploads', key: 'adminNav.uploads', roles: ['store-owner'] },
  { href: '/admin/contact', icon: Mail, label: 'Contact', key: 'adminNav.contact', roles: ['admin'] },
  { href: '/admin/users', icon: Users, label: 'Users', key: 'adminNav.users', roles: ['admin'] },
  { href: '/admin/newsletter', icon: Newspaper, label: 'Newsletter', key: 'adminNav.newsletter', roles: ['admin'] },
  { href: '/admin/settings', icon: Settings, label: 'Settings', key: 'adminNav.settings', roles: ['admin'] },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  const { user } = useSessionUser();
  const { t } = useTranslation();
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
      <div className="fixed bottom-0 inset-x-0 z-50 bg-card border-t-[3px] border-foreground h-16" />
    );
  }

  return (
    <nav
      aria-label={t('adminNav.label', 'Dashboard navigation')}
      className="fixed bottom-0 inset-x-0 z-50 bg-card border-t-[3px] border-foreground pb-[env(safe-area-inset-bottom)]"
    >
      {/* Scrolls sideways when the items don't fit (admins have 9 on a 360 px phone). */}
      <div className="flex h-16 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const label = t(item.key, item.label);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-1 min-w-[4.75rem] flex-col items-center justify-center gap-1 px-1 text-[11px] leading-tight transition-colors h-full',
                isActive ? 'bg-accent text-accent-foreground font-bold' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" aria-hidden />
                {user?.role === 'store-owner' && item.href === '/admin/orders' && hasNewOrders && (
                  <span className="absolute -top-1 -end-1 h-2 w-2 bg-destructive border border-foreground" aria-label={t('adminNav.new', 'New')} />
                )}
                {user?.role === 'store-owner' && item.href === '/store-dashboard/uploads' && hasNewUploads && (
                  <span className="absolute -top-1 -end-1 h-2 w-2 bg-destructive border border-foreground" aria-label={t('adminNav.new', 'New')} />
                )}
              </div>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
