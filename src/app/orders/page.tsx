'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useOrders } from '@/hooks/use-data';
import { useSessionUser } from '@/hooks/use-session';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: string }> = {
    AwaitingAcceptance: { label: 'Awaiting Acceptance', variant: 'outline' },
    Pending: { label: 'Pending', variant: 'secondary' },
    Printing: { label: 'Printing', variant: 'default' },
    Finished: { label: 'Finished', variant: 'success' },
    Pooled: { label: 'Pooled', variant: 'destructive' },
  };
  const meta = map[status] || { label: status, variant: 'outline' };
  return <Badge variant={meta.variant as any}>{meta.label}</Badge>;
}

export default function UserOrdersPage() {
  const { user } = useSessionUser();
  const { data: orders, loading } = useOrders(undefined, { skipFetch: !user });

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Please log in to view your orders.</p>
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
                    <TableCell className="text-right">${order.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No orders yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
