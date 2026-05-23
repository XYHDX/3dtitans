
'use client';
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, UploadCloud, Users, ShoppingBag } from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session';
import { useProducts, useUploads, useOrders, useStores } from '@/hooks/use-data';
import { useUsers } from '@/hooks/use-session';
import { format } from 'date-fns';


export default function DashboardPage() {
    const { user } = useSessionUser();
    const { data: products, loading: productsLoading } = useProducts();
    const { data: uploads, loading: uploadsLoading } = useUploads();
    const { data: orders, loading: ordersLoading } = useOrders();
    const { data: users, loading: usersLoading } = useUsers();
    const { data: stores, loading: storesLoading } = useStores({ includeUnpublished: true });
    const [storeSort, setStoreSort] = useState<'recent' | 'name' | 'products'>('recent');
    const isLoading = productsLoading || uploadsLoading || ordersLoading || usersLoading;

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

    const sortedStores = useMemo(() => {
        const list = stores || [];
        return [...list].sort((a, b) => {
            if (storeSort === 'name') {
                return a.name.localeCompare(b.name);
            }
            if (storeSort === 'products') {
                return (b.productsCount || 0) - (a.productsCount || 0);
            }
            return getDateValue(b.updatedAt || b.createdAt) - getDateValue(a.updatedAt || a.createdAt);
        });
    }, [stores, storeSort]);

    if (user?.role !== 'admin') {
        return (
            <div className="text-center py-16">
                 <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
                <p className="text-muted-foreground mt-4">You do not have permission to view this page.</p>
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
                A full overview of all activity across the platform.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Products
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{products?.length || 0}</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            All User Uploads
                        </CardTitle>
                        <UploadCloud className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{uploads?.length || 0}</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{users?.length || 0}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{orders?.length || 0}</div>}
                    </CardContent>
                </Card>
            </div>
            <div className="mt-8">
                <Card>
                    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>Stores</CardTitle>
                            <CardDescription>Sort stores however you like right from the dashboard.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Sort by</span>
                            <Select value={storeSort} onValueChange={(value) => setStoreSort(value as 'recent' | 'name' | 'products')}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent">Newest updated</SelectItem>
                                    <SelectItem value="name">Name (A-Z)</SelectItem>
                                    <SelectItem value="products">Products count</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Store</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Products</TableHead>
                                    <TableHead>Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {storesLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Skeleton className="h-4 w-32" />
                                                    <Skeleton className="h-3 w-20" />
                                                </div>
                                            </TableCell>
                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : sortedStores.length > 0 ? (
                                    sortedStores.map((store) => (
                                        <TableRow key={store.id}>
                                            <TableCell>
                                                <div className="font-medium">{store.name}</div>
                                                <div className="text-xs text-muted-foreground">/{store.slug}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={store.isPublished ? 'default' : 'secondary'}>
                                                    {store.isPublished ? 'Published' : 'Draft'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{store.productsCount ?? 0}</TableCell>
                                            <TableCell>{formatDate(store.updatedAt || store.createdAt)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-16 text-muted-foreground">
                                            No stores found.
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
