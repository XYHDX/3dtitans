'use client';
import { useCurrency } from '@/hooks/use-currency';
import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Home, Package, ShoppingBag, UploadCloud } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSessionUser } from '@/hooks/use-session';
import { useProducts, useOrders, useUploads, useStores } from '@/hooks/use-data';
import { useTranslation } from '@/components/language-provider';
import { ArchivedBadge, RestoreProductButton, activeFirst, isArchivedProduct } from '@/components/admin/product-archive';

const linkClass = 'underline decoration-primary decoration-2 underline-offset-4 text-foreground';

export default function StoreDashboardPage() {
  const { format: formatPrice } = useCurrency();
    const { user } = useSessionUser();
    const { t, locale } = useTranslation();
    const { data: products, loading: productsLoading, refresh: refreshProducts } = useProducts(
        user?.role === 'store-owner' && user?.id ? { uploaderId: user.id } : undefined
    );
    const { data: assignedOrders, loading: assignedOrdersLoading, hasMore: moreOrders } = useOrders(
        user?.role === 'store-owner' && user?.id ? { ownerId: user.id } : undefined
    );
    const { data: assignedUploads, loading: uploadsLoading } = useUploads();
    const { data: ownerStores, loading: storesLoading } = useStores(
        user?.role === 'store-owner' && user?.id ? { ownerId: user.id, includeUnpublished: true } : undefined,
        { skipFetch: !user?.id || user?.role !== 'store-owner' }
    );

    const isLoading = productsLoading || assignedOrdersLoading || uploadsLoading || storesLoading;
    const store = ownerStores?.[0];
    const [productSort, setProductSort] = useState<'recent' | 'price-desc' | 'price-asc' | 'alpha'>('recent');

    // Archived products are out of the shop: not counted, listed after active ones.
    const archivedCount = useMemo(() => (products || []).filter(isArchivedProduct).length, [products]);
    const activeCount = (products?.length || 0) - archivedCount;

    const getDateValue = (value?: any) => {
        if (!value) return 0;
        const raw = typeof value === 'object' && 'toDate' in value ? value.toDate() : new Date(value as any);
        const date = raw instanceof Date ? raw : new Date(raw);
        return isNaN(date.getTime()) ? 0 : date.getTime();
    };

    const formatDate = (value?: any) => {
        const ts = getDateValue(value);
        if (!ts) return '—';
        return new Date(ts).toLocaleDateString(locale === 'ar' ? 'ar-SY' : 'en-US', { dateStyle: 'medium' });
    };

    const sortedProducts = useMemo(() => {
        const list = products || [];
        const sorted = [...list].sort((a, b) => {
            if (productSort === 'alpha') return a.name.localeCompare(b.name);
            if (productSort === 'price-asc') return a.price - b.price;
            if (productSort === 'price-desc') return b.price - a.price;
            return getDateValue(b.createdAt) - getDateValue(a.createdAt);
        });
        return activeFirst(sorted);
    }, [products, productSort]);

    if (!user) {
        return (
            <div className='max-w-md mx-auto mt-16'>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('uploads.store.loginTitle', 'Please log in')}</CardTitle>
                        <CardDescription>{t('uploads.dash.loginDesc', 'You need to be logged in to view your store dashboard.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className='w-full'>
                            <Link href="/login?next=/store-dashboard">{t('uploads.products.loginLink', 'Log in')}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (user.role !== 'store-owner') {
         return (
            <div className='max-w-md mx-auto mt-16'>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('uploads.common.accessDenied', 'Access denied')}</CardTitle>
                        <CardDescription>{t('uploads.store.ownersOnly', 'This page is only available for store owners.')}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('uploads.dash.title', 'Store dashboard')}</h1>
                <p className="text-muted-foreground">
                    {t('uploads.dash.welcome', 'Welcome back, {name}.', { name: user.displayName || t('uploads.dash.ownerFallback', 'store owner') })}
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 mt-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('uploads.store.title', 'Store profile')}
                        </CardTitle>
                        <Home className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <div className="text-2xl font-bold">{store?.name || t('uploads.dash.notSet', 'Not set')}</div>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                           {store?.isPublished ? t('uploads.store.published', 'Published') : t('uploads.store.draft', 'Draft')}
                           <Link href="/store-dashboard/profile" className={linkClass}>
                             {t('uploads.dash.editProfile', 'Edit profile')}
                           </Link>
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('uploads.archive.dashActiveProducts', 'Products in the shop')}
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{activeCount}</div>}
                        <p className="text-xs text-muted-foreground">
                           {archivedCount > 0
                             ? t('uploads.archive.dashArchivedCount', '+ {count} archived', { count: archivedCount }) + ' · '
                             : null}
                           <Link href="/admin/products" className={linkClass}>{t('uploads.dash.manage', 'Manage')}</Link>
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('uploads.dash.assignedOrders', 'My assigned orders')}
                        </CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <div className="text-2xl font-bold">
                                {/* The orders API returns the newest 100 only. */}
                                {moreOrders
                                    ? t('uploads.dash.countPlus', '{count}+', { count: assignedOrders?.length || 0 })
                                    : assignedOrders?.length || 0}
                            </div>
                        )}
                         <p className="text-xs text-muted-foreground">
                           {t('uploads.dash.assignedOrdersDesc', 'Orders assigned to you.')}{' '}
                           <Link href="/admin/orders" className={linkClass}>{t('uploads.dash.viewOrders', 'View orders')}</Link>
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('uploads.owner.title', 'Assigned print requests')}
                        </CardTitle>
                        <UploadCloud className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{assignedUploads?.length || 0}</div>}
                         <p className="text-xs text-muted-foreground">
                           {t('uploads.owner.desc', 'Files an admin assigned to you.')}{' '}
                           <Link href="/store-dashboard/uploads" className={linkClass}>{t('uploads.dash.viewUploads', 'View requests')}</Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
            <div className="mt-8">
                <Card>
                    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>{t('uploads.dash.productsTitle', 'Products')}</CardTitle>
                            <CardDescription>
                                {t('uploads.dash.productsDesc', 'Your catalogue. Archived products are hidden from the shop and listed last.')}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/products">{t('uploads.dash.manage', 'Manage')}</Link>
                            </Button>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground" id="product-sort-label">{t('uploads.dash.sortBy', 'Sort by')}</span>
                                <Select value={productSort} onValueChange={(value) => setProductSort(value as 'recent' | 'price-desc' | 'price-asc' | 'alpha')}>
                                    <SelectTrigger className="w-[180px]" aria-labelledby="product-sort-label">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recent">{t('uploads.dash.sortRecent', 'Newest first')}</SelectItem>
                                        <SelectItem value="alpha">{t('uploads.dash.sortAlpha', 'Name (A–Z)')}</SelectItem>
                                        <SelectItem value="price-desc">{t('uploads.dash.sortPriceDesc', 'Price (high to low)')}</SelectItem>
                                        <SelectItem value="price-asc">{t('uploads.dash.sortPriceAsc', 'Price (low to high)')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('uploads.products.colName', 'Name')}</TableHead>
                                    <TableHead>{t('uploads.products.colPrice', 'Price')}</TableHead>
                                    <TableHead>{t('uploads.products.category', 'Category')}</TableHead>
                                    <TableHead>{t('uploads.products.colDate', 'Date added')}</TableHead>
                                    <TableHead className="text-end">
                                        <span className="sr-only">{t('uploads.products.colManage', 'Manage')}</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productsLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                            <TableCell />
                                        </TableRow>
                                    ))
                                ) : sortedProducts.length > 0 ? (
                                    sortedProducts.map((product) => {
                                        const archived = isArchivedProduct(product);
                                        return (
                                            <TableRow key={product.id} className={archived ? 'bg-muted/40 text-muted-foreground' : ''}>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span>{product.name}</span>
                                                        {archived && <ArchivedBadge />}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{formatPrice(product.price)}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{product.category}</TableCell>
                                                <TableCell>{formatDate(product.createdAt)}</TableCell>
                                                <TableCell className="text-end">
                                                    {archived ? (
                                                        <RestoreProductButton product={product} onRestored={refreshProducts} />
                                                    ) : null}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-16 text-muted-foreground">
                                            {t('uploads.products.empty', 'No products found.')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
