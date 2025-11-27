'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSessionUser } from "@/hooks/use-session";
import { useOrders } from "@/hooks/use-data";
import { useAppStore } from "@/lib/app-store";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/types";

const ClaimOrderButton = ({ order }: { order: Order }) => {
    const { user } = useSessionUser();
    const claimOrder = useAppStore((s) => s.claimOrder);
    const { toast } = useToast();

    const handleClaim = () => {
        if (!user) return;
        claimOrder(order.id, user.id || user.uid);
        toast({
            title: 'Order Claimed!',
            description: `You have claimed order ${order.id.substring(0, 8)}.`,
        });
    };

    return (
        <Button onClick={handleClaim}>Claim Order</Button>
    )
}

export default function OrderPoolPage() {
    const { user } = useSessionUser();
    const { data: orders, loading } = useOrders({ statusIn: ['Pooled'] });

    const claimableOrders = orders?.filter(order => !order.assignedAdminIds.includes(user?.id || ''));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Order Pool</CardTitle>
                <CardDescription>
                    These orders have been released by their original assignees. Claim one to begin processing.
                </CardDescription>
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
                                        <ClaimOrderButton order={order} />
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
