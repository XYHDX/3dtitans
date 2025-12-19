'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/hooks/use-data';
import { useSessionUser } from '@/hooks/use-session';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: string }> = {
    AwaitingAcceptance: { label: 'Awaiting Acceptance', variant: 'outline' },
    Pending: { label: 'Pending', variant: 'secondary' },
    Printing: { label: 'Printing', variant: 'default' },
    Finished: { label: 'Finished', variant: 'success' },
    Pooled: { label: 'Processing', variant: 'secondary' },
    CancellationRequested: { label: 'Cancellation Requested', variant: 'destructive' },
    Cancelled: { label: 'Cancelled', variant: 'outline' },
  };
  const meta = map[status] || { label: status, variant: 'outline' };
  return <Badge variant={meta.variant as any}>{meta.label}</Badge>;
}

export default function UserOrdersPage() {
  const { user } = useSessionUser();
  const { toast } = useToast();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const { data: orders, loading, requestCancelOrder } = useOrders(
    { statusIn: ['AwaitingAcceptance', 'Pending', 'Printing', 'Finished', 'CancellationRequested', 'Cancelled'] },
    { skipFetch: !user }
  );

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Please log in to view your orders.</p>
      </div>
    );
  }

  if (user.role === 'store-owner') {
    return (
      <div className="text-center py-16 space-y-3">
        <h2 className="text-2xl font-headline text-destructive">Orders unavailable</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Store owner accounts cannot place orders. Switch to a customer account to track purchases.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild variant="secondary">
            <Link href="/store-dashboard">Store dashboard</Link>
          </Button>
          <Button asChild>
            <Link href="/">{'Back home'}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
          <CardDescription>Track the status of your prints.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : orders && orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id.substring(0, 10)}...</TableCell>
                    <TableCell>
                      {order.orderDate
                        ? (() => {
                            const raw =
                              typeof order.orderDate === 'object' && 'toDate' in order.orderDate
                                ? (order.orderDate as any).toDate()
                                : new Date(order.orderDate as any);
                            const d = raw instanceof Date ? raw : new Date(raw);
                            return isNaN(d.getTime()) ? 'N/A' : format(d, 'PPP');
                          })()
                        : 'N/A'}
                    </TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell>
                      {['Finished', 'Cancelled'].includes(order.status) ? (
                        <span className="text-muted-foreground text-sm">No actions</span>
                      ) : order.status === 'CancellationRequested' ? (
                        <span className="text-muted-foreground text-sm">Awaiting store approval</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={cancelingId === order.id}
                          onClick={async () => {
                            setCancelingId(order.id);
                            const updated = await requestCancelOrder(order.id);
                            if (updated) {
                              toast({
                                title: 'Cancellation requested',
                                description: 'The store will confirm your request soon.',
                              });
                            } else {
                              toast({
                                variant: 'destructive',
                                title: 'Unable to request cancellation',
                                description: 'Please try again or contact support.',
                              });
                            }
                            setCancelingId(null);
                          }}
                        >
                          Request cancellation
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">${order.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No orders yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
