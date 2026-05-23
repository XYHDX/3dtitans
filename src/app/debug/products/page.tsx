
'use client';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/hooks/use-data';

export default function DebugProductsPage() {
  const { data: products, loading } = useProducts();

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="font-headline text-5xl">Firestore Debug: Products</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          This page displays raw data directly from your 'products' collection in Firestore.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Products Collection Data</CardTitle>
          <CardDescription>
            {loading ? "Loading documents..." : `Found ${products?.length || 0} documents.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto">
              {JSON.stringify(products, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
