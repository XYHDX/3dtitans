'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSessionUser } from '@/hooks/use-session';
import { useOrders } from '@/hooks/use-data';
import { useTranslation } from '@/components/language-provider';
import type { Order } from '@/lib/types';
import { useCurrency } from '@/hooks/use-currency';
import { PaymentStatusBadge, paymentMethodLabel } from '@/components/payment-status-badge';
import { orderReference } from '@/lib/payments/common';

const OrderStatusSelector = ({ order, onUpdate }: { order: Order; onUpdate: (id: string, patch: Partial<Order>) => Promise<any> }) => {
    const { toast } = useToast();

    const handleStatusChange = async (newStatus: Order['status']) => {
        try {
            await onUpdate(order.id, { status: newStatus });
            toast({
                title: 'Order Status Updated',
                description: `Order ${orderReference(order.id)} is now ${newStatus}.`,
            });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Could not update status', description: err.message });
        }
    };

    if (order.status === 'AwaitingAcceptance') {
        return (
            <span className="text-sm font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded">
                Awaiting Acceptance
            </span>
        );
    }

    if (order.status === 'CancellationRequested') {
        return (
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-destructive bg-destructive/10 px-2 py-1 rounded">
                    Cancellation requested
                </span>
                <Button variant="outline" size="sm" onClick={() => handleStatusChange('Cancelled')}>
                    Approve
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleStatusChange('Pending')}>
                    Keep order
                </Button>
            </div>
        );
    }

    return (
        <Select value={order.status} onValueChange={handleStatusChange as any}>
            <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Printing">Printing</SelectItem>
                <SelectItem value="Finished">Finished</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
        </Select>
    );
};

const PredictedDateSelector = ({ order, onUpdate }: { order: Order; onUpdate: (id: string, patch: Partial<Order>) => Promise<any> }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState<Date | undefined>(() => {
        if (!order.predictedFinishDate) return undefined;
        const raw = typeof order.predictedFinishDate === 'object' && 'toDate' in order.predictedFinishDate
            ? (order.predictedFinishDate as any).toDate()
            : new Date(order.predictedFinishDate as any);
        return isNaN(raw.getTime()) ? undefined : raw;
    });

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (!selectedDate) return;
        setDate(selectedDate);
        onUpdate(order.id, { predictedFinishDate: selectedDate as any })
            .then(() =>
                toast({
                    title: 'Predicted Date Set',
                    description: `Finish date for order ${orderReference(order.id)} updated.`,
                })
            )
            .catch((err: any) => toast({ variant: 'destructive', title: 'Could not set date', description: err.message }));
        setOpen(false);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Set finish date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}

const PrioritizeSwitch = ({ order, onUpdate }: { order: Order; onUpdate: (id: string, patch: Partial<Order>) => Promise<any> }) => {
    const { toast } = useToast();
    const { format: formatPrice } = useCurrency();
    // Priority changes the price, so it is locked once the customer has paid / sent proof.
    const locked = !['pending', 'failed'].includes(order.paymentStatus || 'pending');

    const handlePrioritizeChange = async (isPrioritized: boolean) => {
        try {
            const updated = await onUpdate(order.id, { isPrioritized });
            toast({
                title: `Order ${isPrioritized ? 'Prioritized' : 'Deprioritized'}`,
                description: `Total is now ${formatPrice(updated?.totalAmount ?? order.totalAmount)}.`,
            });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Could not change priority', description: err.message });
        }
    }

    return (
        <div className="flex items-center space-x-2">
            <Switch
                id={`prioritize-${order.id}`}
                checked={order.isPrioritized || false}
                disabled={locked}
                onCheckedChange={handlePrioritizeChange}
            />
            <Label htmlFor={`prioritize-${order.id}`}>
                Prioritize (+20%){locked ? ' — locked after payment' : ''}
            </Label>
        </div>
    )
}

/** Payment details + admin review actions for one order. */
const PaymentPanel = ({ order, isAdmin, onChanged }: { order: Order; isAdmin: boolean; onChanged: () => void }) => {
    const { toast } = useToast();
    const [busy, setBusy] = useState(false);
    const status = order.paymentStatus || 'pending';

    const act = async (action: 'mark_paid' | 'reject' | 'mark_refunded') => {
        if (action === 'mark_refunded' && !window.confirm('Mark this payment as refunded? The order will be cancelled.')) return;
        setBusy(true);
        try {
            const res = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id, action }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed');
            toast({ title: 'Payment updated', description: `${orderReference(order.id)} is now ${data.paymentStatus}.` });
            onChanged();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Could not update payment', description: err.message });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="text-sm bg-background p-4 rounded-md space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
                <span><strong>Method:</strong> {paymentMethodLabel(order.paymentMethod)}</span>
                <PaymentStatusBadge status={status} method={order.paymentMethod} />
            </div>
            <p><strong>Reference to look for:</strong> <span className="font-mono">{orderReference(order.id)}</span></p>
            {isAdmin && order.paymentReference && (
                <p className="break-all"><strong>Customer reference:</strong> <span className="font-mono">{order.paymentReference}</span></p>
            )}
            {isAdmin && order.hasPaymentProof && (
                <p>
                    <a
                        href={`/api/payments/proof/view?orderId=${encodeURIComponent(order.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                    >
                        View payment screenshot
                    </a>
                </p>
            )}
            {!isAdmin && status !== 'paid' && order.paymentMethod && order.paymentMethod !== 'cod' && (
                <p className="text-destructive text-xs">Payment not confirmed yet — don&apos;t start printing until it shows Paid.</p>
            )}
            {isAdmin && (
                <div className="flex flex-wrap gap-2 pt-2">
                    {status !== 'paid' && status !== 'refunded' && (
                        <>
                            <Button size="sm" disabled={busy} onClick={() => act('mark_paid')}>Mark paid</Button>
                            {status !== 'failed' && (
                                <Button size="sm" variant="destructive" disabled={busy} onClick={() => act('reject')}>Reject payment</Button>
                            )}
                        </>
                    )}
                    {status === 'paid' && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act('mark_refunded')}>Mark refunded</Button>
                    )}
                </div>
            )}
        </div>
    );
};

function OrdersList() {
    const { user } = useSessionUser();
    const { t } = useTranslation();
    const baseFilter =
        user?.role === 'store-owner' && user?.id
            ? { ownerId: user.id, statusIn: ['AwaitingAcceptance', 'Pending', 'Printing', 'Finished', 'CancellationRequested', 'Cancelled'] as any }
            : { statusIn: ['AwaitingAcceptance', 'Pending', 'Printing', 'Finished', 'CancellationRequested', 'Cancelled'] as any };
    const { data: allOrders, loading: ordersLoading, updateOrder, releaseOrderToPool, refresh } = useOrders(baseFilter);
    const { format: formatPrice } = useCurrency();
    const { toast } = useToast();
    const isAdmin = user?.role === 'admin';
    const [reviewOnly, setReviewOnly] = useState(false);
    const [reconciling, setReconciling] = useState(false);
    const toReview = allOrders.filter((o) => o.paymentStatus === 'verifying').length;
    const orders = reviewOnly ? allOrders.filter((o) => o.paymentStatus === 'verifying') : allOrders;

    const reconcileShamCash = async () => {
        setReconciling(true);
        try {
            const res = await fetch('/api/payments/shamcash/reconcile');
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Check failed');
            toast({
                title: 'Sham Cash checked',
                description: `${data.checked || 0} open order(s) checked, ${data.paid?.length || 0} newly paid.`,
            });
            refresh();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Sham Cash check failed', description: err.message });
        } finally {
            setReconciling(false);
        }
    };

    if (ordersLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    const toolbar = (
        <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center space-x-2">
                <Switch id="review-only" checked={reviewOnly} onCheckedChange={setReviewOnly} />
                <Label htmlFor="review-only">Payments to review ({toReview})</Label>
            </div>
            {isAdmin && (
                <Button size="sm" variant="outline" disabled={reconciling} onClick={reconcileShamCash}>
                    {reconciling ? 'Checking…' : 'Check Sham Cash payments'}
                </Button>
            )}
        </div>
    );

    return orders && orders.length > 0 ? (
        <>
        {toolbar}
        <Accordion type="single" collapsible className="w-full space-y-4">
            {orders.map((order) => (
                <AccordionItem value={order.id} key={order.id} className="bg-muted/50 rounded-lg">
                    <div className="flex items-center w-full flex-wrap gap-4 px-4 py-2">
                        <AccordionTrigger className="flex-1 hover:no-underline py-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-left">
                                <div>
                                    <span className="font-bold block sm:inline">Order: </span>
                                    <span className="font-mono text-xs text-muted-foreground">{orderReference(order.id)}</span>
                                </div>
                                <div>
                                    <span className="font-bold block sm:inline">Customer: </span>
                                    <span>{order.shippingAddress.fullName} ({order.customerEmail})</span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-4 py-2" onClick={(e) => e.stopPropagation()}>
                            <OrderStatusSelector order={order} onUpdate={updateOrder} />
                            <PaymentStatusBadge status={order.paymentStatus} method={order.paymentMethod} />
                            <span className="font-bold text-lg">{formatPrice(order.totalAmount)}</span>
                        </div>
                    </div>
                    <AccordionContent className="px-4">
                        <div className="pt-4 border-t grid md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-semibold mb-2">Items:</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {order.items.map((item) => (
                                            <TableRow key={item.productId}>
                                                <TableCell className="flex items-center gap-2">
                                                    <Image src={item.imageUrl || 'https://placehold.co/40x40'} alt={item.name} width={40} height={40} className="rounded object-cover" />
                                                    <span>{item.name}</span>
                                                </TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell className="text-right">{formatPrice(item.price)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Shipping Details:</h4>
                                    <div className="text-sm bg-background p-4 rounded-md">
                                        <p><strong>Name:</strong> {order.shippingAddress.fullName}</p>
                                        <p><strong>Phone:</strong> {order.phoneNumber}</p>
                                        <p><strong>Address:</strong> {order.shippingAddress.addressLine1}, {order.shippingAddress.city}, {order.shippingAddress.postalCode}, {order.shippingAddress.country}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">{t('orders.customerNotes')}</h4>
                                    <div className="text-sm bg-background p-4 rounded-md">
                                        {order.notes && order.notes.trim() ? (
                                            <p className="whitespace-pre-line">{order.notes}</p>
                                        ) : (
                                            <p className="text-muted-foreground">{t('orders.noCustomerNotes')}</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Payment:</h4>
                                    <PaymentPanel order={order} isAdmin={isAdmin} onChanged={refresh} />
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Order Management:</h4>
                                    <div className="text-sm bg-background p-4 rounded-md space-y-4">
                                        {order.status === 'AwaitingAcceptance' ? (
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        updateOrder(order.id, { status: 'Pending' }).catch((err: any) =>
                                                            toast({ variant: 'destructive', title: 'Could not accept', description: err.message })
                                                        )
                                                    }
                                                >
                                                    Accept
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => releaseOrderToPool(order.id)}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <PredictedDateSelector order={order} onUpdate={updateOrder} />
                                                {isAdmin && <PrioritizeSwitch order={order} onUpdate={updateOrder} />}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
        </>
    ) : (
        <>
        {toolbar}
        <div className="text-center py-16">
            <p className="text-muted-foreground">{reviewOnly ? 'No payments waiting for review.' : 'No orders found.'}</p>
        </div>
        </>
    );
}

export default function OrdersAdminPage() {
    const { user } = useSessionUser();

    if (!user) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">Please log in to view orders.</p>
            </div>
        )
    }

    if (user.role !== 'admin' && user.role !== 'store-owner') {
        return (
            <div className="text-center py-16">
                <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
                <p className="text-muted-foreground mt-4">You do not have permission to view this page.</p>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Orders</CardTitle>
                <CardDescription>A list of all orders assigned to you or all orders if you're an admin.</CardDescription>
            </CardHeader>
            <CardContent>
                <OrdersList />
            </CardContent>
        </Card>
    );
}
