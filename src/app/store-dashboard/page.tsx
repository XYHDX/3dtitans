
'use client';
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
import { format } from 'date-fns';

export default function StoreDashboardPage() {
    const { user } = useSessionUser();
    const { data: products, loading: productsLoading } = useProducts(
        user?.role === 'store-owner' && user?.id ? { uploaderId: user.id } : undefined
    );
    const { data: assignedOrders, loading: assignedOrdersLoading } = useOrders(
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

    const getDateValue = (value?: any) => {
        if (!value) return 0;
        const raw = typeof value === 'object' && 'toDate' in value ? value.toDate() : new Date(value as any);
        const date = raw instanceof Date ? raw : new Date(raw);
        return isNaN(date.getTime()) ? 0 : date.getTime();
    };

    const formatDate = (value?: any) => {
        const ts = getDateValue(value);
        if (!ts) return '—';
        return format(new Date(ts), 'PPP');
    };

    const sortedProducts = useMemo(() => {
        const list = products || [];
        return [...list].sort((a, b) => {
            if (productSort === 'alpha') return a.name.localeCompare(b.name);
            if (productSort === 'price-asc') return a.price - b.price;
            if (productSort === 'price-desc') return b.price - a.price;
            return getDateValue(b.createdAt) - getDateValue(a.createdAt);
        });
    }, [products, productSort]);

    if (!user) {
        return (
            <div className='max-w-md mx-auto mt-16'>
                <Card>
                    <CardHeader>
                        <CardTitle>Please Log In</CardTitle>
                        <CardDescription>You need to be logged in to view your store dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className='w-full'>
                            <Link href="/login">Login</Link>
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
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>This dashboard is only available to store owners.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Store Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user.displayName || 'Store Owner'}.
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 mt-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Store Profile
                        </CardTitle>
                        <Home className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <div className="text-2xl font-bold">{store?.name || 'Not set'}</div>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                           {store?.isPublished ? 'Published' : 'Draft'}
                           <Link href="/store-dashboard/profile" className="underline">
                             Edit profile
                           </Link>
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            My Products
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{products?.length || 0}</div>}
                        <p className="text-xs text-muted-foreground">
                           Products you have uploaded. <Link href="/admin/products" className="underline">Manage</Link>
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            My Assigned Orders
                        </CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{assignedOrders?.length || 0}</div>}
                         <p className="text-xs text-muted-foreground">
                           Orders assigned to you. <Link href="/admin/orders" className="underline">View Orders</Link>
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            My Assigned Uploads
                        </CardTitle>
                        <UploadCloud className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{assignedUploads?.length || 0}</div>}
                         <p className="text-xs text-muted-foreground">
                           Uploads assigned to you. <Link href="/store-dashboard/uploads" className="underline">View Uploads</Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
            <div className="mt-8">
                <Card>
                    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>Products</CardTitle>
                            <CardDescription>Sort your catalogue without leaving the dashboard.</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/products">Manage</Link>
                            </Button>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Sort by</span>
                                <Select value={productSort} onValueChange={(value) => setProductSort(value as 'recent' | 'price-desc' | 'price-asc' | 'alpha')}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recent">Newest first</SelectItem>
                                        <SelectItem value="alpha">Name (A-Z)</SelectItem>
                                        <SelectItem value="price-desc">Price (high to low)</SelectItem>
                                        <SelectItem value="price-asc">Price (low to high)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Added</TableHead>
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
                                        </TableRow>
                                    ))
                                ) : sortedProducts.length > 0 ? (
                                    sortedProducts.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>${product.price.toFixed(2)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{product.category}</TableCell>
                                            <TableCell>{formatDate(product.createdAt)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-16 text-muted-foreground">
                                            No products found.
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
