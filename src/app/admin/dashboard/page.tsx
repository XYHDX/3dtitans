
'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Package, UploadCloud, Users, ShoppingBag, GripVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSessionUser } from '@/hooks/use-session';
import { useProducts, useUploads, useOrders, useStores } from '@/hooks/use-data';
import { useUsers } from '@/hooks/use-session';
import { format } from 'date-fns';


export default function DashboardPage() {
    const { user } = useSessionUser();
    const { toast } = useToast();
    const { data: products, loading: productsLoading } = useProducts();
    const { data: uploads, loading: uploadsLoading } = useUploads();
    const { data: orders, loading: ordersLoading } = useOrders();
    const { data: users, loading: usersLoading } = useUsers();
    const { data: stores, loading: storesLoading, refresh: refreshStores } = useStores({ includeUnpublished: true });
    const [storeSort, setStoreSort] = useState<'manual' | 'recent' | 'name' | 'products'>('manual');
    const [manualOrder, setManualOrder] = useState<string[]>([]);
    const [savingOrder, setSavingOrder] = useState(false);
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

    // Initialize manual order from server data, preserving server sortOrder when present
    useEffect(() => {
        if (!stores || stores.length === 0) return;
        // Don't overwrite local rearrangements once the user has touched them
        if (manualOrder.length === 0) {
            const ordered = [...stores].sort((a: any, b: any) => {
                const ao = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
                const bo = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
                if (ao !== bo) return ao - bo;
                return getDateValue(b.updatedAt || b.createdAt) - getDateValue(a.updatedAt || a.createdAt);
            });
            setManualOrder(ordered.map((s) => s.id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stores]);

    const sortedStores = useMemo(() => {
        const list = stores || [];
        if (storeSort === 'manual') {
            const byId = new Map(list.map((s) => [s.id, s]));
            // Use saved manual order; fall back to any newly-added stores at the end
            const known = manualOrder.map((id) => byId.get(id)).filter(Boolean) as typeof list;
            const extras = list.filter((s) => !manualOrder.includes(s.id));
            return [...known, ...extras];
        }
        return [...list].sort((a, b) => {
            if (storeSort === 'name') return a.name.localeCompare(b.name);
            if (storeSort === 'products') return (b.productsCount || 0) - (a.productsCount || 0);
            return getDateValue(b.updatedAt || b.createdAt) - getDateValue(a.updatedAt || a.createdAt);
        });
    }, [stores, storeSort, manualOrder]);

    function moveStore(id: string, direction: -1 | 1) {
        setManualOrder((prev) => {
            const idx = prev.indexOf(id);
            if (idx < 0) return prev;
            const next = idx + direction;
            if (next < 0 || next >= prev.length) return prev;
            const out = [...prev];
            [out[idx], out[next]] = [out[next], out[idx]];
            return out;
        });
    }

    async function saveOrder() {
        setSavingOrder(true);
        try {
            const res = await fetch('/api/admin/stores/reorder', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: manualOrder }),
            });
            if (!res.ok) throw new Error('Reorder failed');
            toast({ title: 'Store order saved', description: 'New ordering is live across the site.' });
            await refreshStores();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Save failed', description: e.message });
        } finally {
            setSavingOrder(false);
        }
    }

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
                                    <SelectItem value="manual">Manual order</SelectItem>
                                    <SelectItem value="recent">Newest updated</SelectItem>
                                    <SelectItem value="name">Name (A-Z)</SelectItem>
                                    <SelectItem value="products">Products count</SelectItem>
                                </SelectContent>
                            </Select>
                            {storeSort === 'manual' && (
                                <Button size="sm" onClick={saveOrder} disabled={savingOrder}>
                                    {savingOrder ? 'Saving…' : 'Save order'}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {storeSort === 'manual' && <TableHead className="w-20">Order</TableHead>}
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
                                    sortedStores.map((store, idx) => (
                                        <TableRow key={store.id}>
                                            {storeSort === 'manual' && (
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            onClick={() => moveStore(store.id, -1)}
                                                            disabled={idx === 0}
                                                            aria-label={`Move ${store.name} up`}
                                                            className="h-7 w-7"
                                                        >
                                                            <ArrowUp className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            onClick={() => moveStore(store.id, 1)}
                                                            disabled={idx === sortedStores.length - 1}
                                                            aria-label={`Move ${store.name} down`}
                                                            className="h-7 w-7"
                                                        >
                                                            <ArrowDown className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {storeSort === 'manual' && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                                                    <div>
                                                        <div className="font-medium">{store.name}</div>
                                                        <div className="text-xs text-muted-foreground">/{store.slug}</div>
                                                    </div>
                                                </div>
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
                                        <TableCell colSpan={storeSort === 'manual' ? 5 : 4} className="text-center h-16 text-muted-foreground">
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
