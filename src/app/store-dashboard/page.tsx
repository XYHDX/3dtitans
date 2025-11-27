
'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import type { Product, Order } from '@/lib/types';
import { Package, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSessionUser } from '@/hooks/use-session';
import { useProducts, useOrders } from '@/hooks/use-data';

export default function StoreDashboardPage() {
    const { user } = useSessionUser();
    const { data: products, loading: productsLoading } = useProducts(
        user?.role === 'store-owner' && user?.id ? { uploaderId: user.id } : undefined
    );
    const { data: assignedOrders, loading: assignedOrdersLoading } = useOrders(
        user?.role === 'store-owner' && user?.id ? { ownerId: user.id } : undefined
    );

    const isLoading = productsLoading || assignedOrdersLoading;

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
            </div>
        </div>
    );
}
