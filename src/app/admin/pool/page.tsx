'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSessionUser } from "@/hooks/use-session";
import { useOrders } from "@/hooks/use-data";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

const ClaimOrderButton = ({ order, onClaim, onAfterClaim }: { order: Order; onClaim: (id: string, ownerId: string) => Promise<any>; onAfterClaim?: () => void }) => {
    const { user } = useSessionUser();
    const { toast } = useToast();

    const handleClaim = async () => {
        if (!user) return;
        const claimed = await onClaim(order.id, user.id || user.uid);
        if (claimed) {
            toast({
                title: 'Order Claimed!',
                description: `You have claimed order ${order.id.substring(0, 8)}.`,
            });
            onAfterClaim?.();
        } else {
            toast({
                variant: 'destructive',
                title: 'Claim failed',
                description: 'Could not claim this order. Please try again.',
            });
        }
    };

    return (
        <Button onClick={handleClaim}>Claim Order</Button>
    )
}

export default function OrderPoolPage() {
    const { user } = useSessionUser();
    const { data: orders, loading, claimOrder, deleteOrder, refresh } = useOrders({ statusIn: ['Pooled'] });

    const claimableOrders = orders?.filter(order => !order.assignedAdminIds.includes(user?.id || ''));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Order Pool</CardTitle>
                <CardDescription>
                    These orders have been released by their original assignees. Claim one to begin processing.
                </CardDescription>
                <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 shadow-sm flex items-start gap-3">
                  <div className="mt-0.5 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-destructive font-bold">Important</p>
                    <p className="text-sm font-semibold text-destructive">
                      Warning: if you DO NOT HAVE THE STL DO NOT CLAIM IT!
                    </p>
                  </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Date Placed</TableHead>
                            <TableHead>Total Items</TableHead>
                            <TableHead>Total Value</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : claimableOrders && claimableOrders.length > 0 ? (
                            claimableOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-xs">{order.id.substring(0,12)}...</TableCell>
                                    <TableCell>
                                        {order.orderDate
                                            ? (() => {
                                                const raw = typeof order.orderDate === 'object' && 'toDate' in order.orderDate
                                                    ? (order.orderDate as any).toDate()
                                                    : new Date(order.orderDate as any);
                                                const d = raw instanceof Date ? raw : new Date(raw);
                                                return isNaN(d.getTime()) ? 'N/A' : format(d, 'PPP');
                                            })()
                                            : 'N/A'}
                                    </TableCell>
                                    <TableCell>{order.items.reduce((acc, item) => acc + item.quantity, 0)}</TableCell>
                    <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <ClaimOrderButton order={order} onClaim={claimOrder} onAfterClaim={refresh} />
                                            {user?.role === 'admin' && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={async () => {
                                                        const ok = await deleteOrder(order.id);
                                                        if (ok) {
                                                            refresh();
                                                        }
                                                    }}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    The order pool is currently empty.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
