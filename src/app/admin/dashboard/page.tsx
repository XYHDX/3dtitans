
'use client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, UploadCloud, Users, ShoppingBag } from 'lucide-react';
import type { Order, Product, Upload, UserProfile } from '@/lib/types';
import { useSessionUser } from '@/hooks/use-session';
import { useProducts, useUploads, useOrders } from '@/hooks/use-data';
import { useUsers } from '@/hooks/use-session';


export default function DashboardPage() {
    const { user } = useSessionUser();
    const { data: products, loading: productsLoading } = useProducts();
    const { data: uploads, loading: uploadsLoading } = useUploads();
    const { data: orders, loading: ordersLoading } = useOrders();
    const { data: users, loading: usersLoading } = useUsers();
    const isLoading = productsLoading || uploadsLoading || ordersLoading || usersLoading;

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
             <div className="mt-8 text-center border-2 border-dashed border-muted rounded-lg p-16">
                <p className="text-muted-foreground">More admin-specific analytics and tools coming soon!</p>
            </div>
        </div>
    );
}
