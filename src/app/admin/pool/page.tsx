'use client';
import { useState } from 'react';
import { useCurrency } from '@/hooks/use-currency';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSessionUser } from "@/hooks/use-session";
import { useTranslation } from '@/components/language-provider';
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { formatMoney, orderReference } from '@/lib/payments/common';
import { useOrderList, type ListedOrder } from '@/lib/orders/use-order-list';

const POOL_STATUS = ['Pooled'];

const ClaimOrderButton = ({ order, onClaimed }: { order: ListedOrder; onClaimed: (id: string) => void }) => {
    const { user } = useSessionUser();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);

    const handleClaim = async () => {
        if (!user) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ claimForOwnerId: user.id || user.uid }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || t('backend.pool.claimFailedBody', 'Could not claim this order. Please try again.'));
            toast({
                title: t('backend.pool.claimed', 'Order claimed!'),
                description: t('backend.pool.claimedBody', 'You have claimed order {ref}. It is now in your orders.', { ref: orderReference(order.id) }),
            });
            onClaimed(order.id);
        } catch (err: any) {
            toast({ variant: 'destructive', title: t('backend.pool.claimFailed', 'Claim failed'), description: err.message });
            // Someone else may have claimed it: reload the pool.
            onClaimed('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Button onClick={handleClaim} disabled={busy}>
            {busy ? t('backend.pool.claiming', 'Claiming…') : t('backend.pool.claim', 'Claim order')}
        </Button>
    )
}

export default function OrderPoolPage() {
    const { currency } = useCurrency();
    const { user } = useSessionUser();
    const { t } = useTranslation();
    const { toast } = useToast();
    const isAdmin = user?.role === 'admin';
    const { orders, loading, loadingMore, error, hasMore, refresh, loadMore, deleteOrder, remove } = useOrderList(
        { status: POOL_STATUS, scope: isAdmin ? undefined : 'pool' },
        !!user
    );

    const onClaimed = (id: string) => {
        if (id) remove(id);
        else refresh();
    };

    const removeOrder = async (order: ListedOrder) => {
        if (!window.confirm(t('backend.pool.confirmRemove', 'Delete order {ref} permanently? Orders with payments cannot be deleted; cancel them instead.', { ref: orderReference(order.id) }))) return;
        try {
            await deleteOrder(order.id);
            toast({ title: t('backend.pool.removed', 'Order deleted') });
        } catch (err: any) {
            toast({ variant: 'destructive', title: t('backend.pool.removeFailed', 'Could not delete the order'), description: err.message });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('backend.pool.title', 'Order pool')}</CardTitle>
                <CardDescription>
                    {t('backend.pool.description', 'These orders were released by their original store or not accepted in time. Claim one to start processing it; the customer details appear once you claim it.')}
                </CardDescription>
                <div className="mt-3 border-[2px] border-foreground bg-accent/30 px-4 py-3 flex items-start gap-3" role="note">
                    <div className="mt-0.5 text-foreground">
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-foreground font-bold">{t('backend.pool.important', 'Important')}</p>
                        <p className="text-sm font-semibold text-foreground">
                            {t('backend.pool.warning', "Only claim an order if you have the STL file for its items.")}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('backend.pool.orderId', 'Order')}</TableHead>
                            <TableHead>{t('backend.pool.datePlaced', 'Date placed')}</TableHead>
                            <TableHead>{t('backend.pool.items', 'Items')}</TableHead>
                            <TableHead>{t('backend.pool.city', 'City')}</TableHead>
                            <TableHead>{t('backend.pool.total', 'Total')}</TableHead>
                            <TableHead className="text-end">{t('backend.pool.action', 'Action')}</TableHead>
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
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="text-end"><Skeleton className="h-8 w-24 ms-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    <span className="text-destructive" role="alert">{t('backend.pool.loadFailed', 'Could not load the order pool.')}</span>{' '}
                                    <Button variant="outline" size="sm" onClick={refresh}>{t('backend.common.retry', 'Try again')}</Button>
                                </TableCell>
                            </TableRow>
                        ) : orders.length > 0 ? (
                            orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-xs">{orderReference(order.id)}</TableCell>
                                    <TableCell>
                                        {order.orderDate
                                            ? (() => {
                                                const raw = typeof order.orderDate === 'object' && 'toDate' in order.orderDate
                                                    ? (order.orderDate as any).toDate()
                                                    : new Date(order.orderDate as any);
                                                const d = raw instanceof Date ? raw : new Date(raw);
                                                return isNaN(d.getTime()) ? '—' : format(d, 'PPP');
                                            })()
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <span className="block">{order.items.reduce((acc, item) => acc + item.quantity, 0)}</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}
                                        </span>
                                    </TableCell>
                                    <TableCell>{order.shippingAddress?.city || '—'}</TableCell>
                                    <TableCell>{formatMoney(order.totalAmount, order.currency || currency)}</TableCell>
                                    <TableCell className="text-end">
                                        <div className="flex items-center justify-end gap-2">
                                            <ClaimOrderButton order={order} onClaimed={onClaimed} />
                                            {isAdmin && (
                                                <Button variant="destructive" size="sm" onClick={() => removeOrder(order)}>
                                                    {t('backend.pool.remove', 'Remove')}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    {t('backend.pool.empty', 'The order pool is currently empty.')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {hasMore && (
                    <div className="flex justify-center pt-6">
                        <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
                            {loadingMore ? t('backend.common.loading', 'Loading…') : t('backend.pool.loadMore', 'Load more')}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
