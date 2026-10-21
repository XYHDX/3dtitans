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
import { AlertTriangle, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSessionUser } from '@/hooks/use-session';
import { useTranslation } from '@/components/language-provider';
import { useCurrency } from '@/hooks/use-currency';
import { PaymentStatusBadge, paymentMethodLabel } from '@/components/payment-status-badge';
import { MANUAL_PAYMENT_METHODS, formatMoney, orderReference, type PaymentMethodId } from '@/lib/payments/common';
import { allowedStatusChanges, paymentBlocksStatus, type OrderActor } from '@/lib/orders/transitions';
import { useOrderList, type ListedOrder } from '@/lib/orders/use-order-list';

type Translate = ReturnType<typeof useTranslation>['t'];
type PatchOrder = (id: string, body: Record<string, unknown>) => Promise<ListedOrder>;

/** Statuses listed on this page (pooled orders live on the Order Pool page). */
const LIST_STATUSES = ['AwaitingAcceptance', 'Pending', 'Printing', 'Finished', 'CancellationRequested', 'Cancelled'];

function statusLabel(t: Translate, status: string) {
    const labels: Record<string, string> = {
        AwaitingAcceptance: t('backend.status.AwaitingAcceptance', 'Awaiting acceptance'),
        Pending: t('backend.status.Pending', 'Pending'),
        Pooled: t('backend.status.Pooled', 'In the pool'),
        Printing: t('backend.status.Printing', 'Printing'),
        Finished: t('backend.status.Finished', 'Finished'),
        CancellationRequested: t('backend.status.CancellationRequested', 'Cancellation requested'),
        Cancelled: t('backend.status.Cancelled', 'Cancelled'),
    };
    return labels[status] || status;
}

function paymentStatusLabel(t: Translate, status: string) {
    const labels: Record<string, string> = {
        pending: t('backend.paymentStatus.pending', 'awaiting payment'),
        verifying: t('backend.paymentStatus.verifying', 'under review'),
        paid: t('backend.paymentStatus.paid', 'paid'),
        failed: t('backend.paymentStatus.failed', 'not confirmed'),
        refunded: t('backend.paymentStatus.refunded', 'refunded'),
    };
    return labels[status] || status;
}

/** Money in the order's own currency (legacy orders: the store currency). */
function useOrderMoney() {
    const { currency } = useCurrency();
    return (amount: number, order: ListedOrder) => formatMoney(amount, order.currency || currency);
}

const OrderStatusSelector = ({ order, actor, onPatch }: { order: ListedOrder; actor: OrderActor; onPatch: PatchOrder }) => {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const targets = allowedStatusChanges(actor, order);

    const run = async (body: Record<string, unknown>, nextLabel: string) => {
        setBusy(true);
        try {
            await onPatch(order.id, body);
            toast({
                title: t('backend.orders.statusUpdated', 'Order status updated'),
                description: t('backend.orders.statusUpdatedBody', 'Order {ref} is now {status}.', {
                    ref: orderReference(order.id),
                    status: nextLabel,
                }),
            });
        } catch (err: any) {
            toast({ variant: 'destructive', title: t('backend.orders.statusFailed', 'Could not update status'), description: err.message });
        } finally {
            setBusy(false);
        }
    };

    if (order.status === 'AwaitingAcceptance') {
        return <Badge variant="sale">{statusLabel(t, order.status)}</Badge>;
    }

    if (order.status === 'CancellationRequested') {
        const cancelBlocked = paymentBlocksStatus(order, 'Cancelled');
        return (
            <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="destructive">{statusLabel(t, order.status)}</Badge>
                {targets.includes('Cancelled') && (
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => run({ status: 'Cancelled' }, statusLabel(t, 'Cancelled'))}>
                        {t('backend.orders.approveCancellation', 'Approve')}
                    </Button>
                )}
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => run({ keepOrder: true }, t('backend.orders.keptStatus', 'back to its previous status'))}>
                    {t('backend.orders.keepOrder', 'Keep order')}
                </Button>
                {cancelBlocked && (
                    <span className="text-xs text-muted-foreground">
                        {order.paymentStatus === 'paid'
                            ? t('backend.orders.refundToCancel', 'Paid: refund the payment to cancel.')
                            : t('backend.orders.reviewToCancel', 'Review the payment before cancelling.')}
                    </span>
                )}
            </div>
        );
    }

    if (!targets.length) {
        return <Badge variant="outline">{statusLabel(t, order.status)}</Badge>;
    }

    return (
        <Select value={order.status} disabled={busy} onValueChange={(value) => value !== order.status && run({ status: value }, statusLabel(t, value))}>
            <SelectTrigger className="w-[150px]" aria-label={t('backend.orders.statusLabel', 'Order status')}>
                <SelectValue placeholder={t('backend.orders.statusLabel', 'Order status')} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={order.status}>{statusLabel(t, order.status)}</SelectItem>
                {targets.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel(t, s)}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

const PredictedDateSelector = ({ order, onPatch }: { order: ListedOrder; onPatch: PatchOrder }) => {
    const { toast } = useToast();
    const { t } = useTranslation();
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
        onPatch(order.id, { predictedFinishDate: selectedDate.toISOString() })
            .then(() =>
                toast({
                    title: t('backend.orders.dateSet', 'Finish date set'),
                    description: t('backend.orders.dateSetBody', 'Finish date for order {ref} updated.', { ref: orderReference(order.id) }),
                })
            )
            .catch((err: any) => toast({ variant: 'destructive', title: t('backend.orders.dateFailed', 'Could not set date'), description: err.message }));
        setOpen(false);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                    {date ? format(date, "PPP") : <span>{t('backend.orders.setFinishDate', 'Set finish date')}</span>}
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

const PrioritizeSwitch = ({ order, onPatch }: { order: ListedOrder; onPatch: PatchOrder }) => {
    const { toast } = useToast();
    const { t } = useTranslation();
    const money = useOrderMoney();
    // Priority changes the price, so it is locked once the customer has started
    // paying (reference, screenshot, card checkout) or the order is closed.
    const locked =
        (order.paymentStatus || 'pending') !== 'pending' ||
        !!order.paymentReference ||
        !!order.hasPaymentProof ||
        ['Finished', 'Cancelled', 'CancellationRequested'].includes(order.status);

    const handlePrioritizeChange = async (isPrioritized: boolean) => {
        try {
            const updated = await onPatch(order.id, { isPrioritized });
            toast({
                title: isPrioritized
                    ? t('backend.orders.prioritized', 'Order prioritized')
                    : t('backend.orders.deprioritized', 'Priority removed'),
                description: t('backend.orders.newTotalEmailed', 'New total {total}. The customer was emailed the new amount.', {
                    total: money(updated?.totalAmount ?? order.totalAmount, order),
                }),
            });
        } catch (err: any) {
            toast({ variant: 'destructive', title: t('backend.orders.priorityFailed', 'Could not change priority'), description: err.message });
        }
    }

    return (
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Switch
                id={`prioritize-${order.id}`}
                checked={order.isPrioritized || false}
                disabled={locked}
                onCheckedChange={handlePrioritizeChange}
            />
            <Label htmlFor={`prioritize-${order.id}`}>
                {t('backend.orders.prioritize', 'Prioritize (+20%)')}
                {locked ? ` — ${t('backend.orders.priorityLocked', 'locked once payment has started')}` : ''}
            </Label>
        </div>
    )
}

/** "shamcash-epay:<billNo>:<tranId>" → { billNo, tranId } (set when a ShamCash e-pay bill is paid). */
function parseShamCashEpayReference(ref?: string | null): { billNo: string; tranId: string } | null {
    const m = /^shamcash-epay:(.+):(\d+)$/.exec(ref || '');
    return m ? { billNo: m[1], tranId: m[2] } : null;
}

/**
 * Real refund through the ShamCash e-pay API (money goes back to the customer's
 * wallet from the business balance). Two steps — details, then an explicit
 * confirmation — all inside the page.
 */
const ShamCashRefund = ({ order, onChanged }: { order: ListedOrder; onChanged: () => void }) => {
    const { toast } = useToast();
    const { t } = useTranslation();
    const money = useOrderMoney();
    const [step, setStep] = useState<'closed' | 'form' | 'confirm'>('closed');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');
    // Kept after a timeout so pressing refund again re-uses the same idempotency key (safe retry).
    const [retry, setRetry] = useState<{ key: string; amount: string } | null>(null);

    const trimmed = amount.trim();
    const amountLabel = trimmed
        ? money(Number(trimmed), order)
        : t('backend.refund.fullAmount', 'the full remaining amount (up to {total})', { total: money(order.totalAmount, order) });

    const review = () => {
        if (trimmed) {
            const n = Number(trimmed);
            if (!Number.isFinite(n) || n <= 0 || !/^\d+(\.\d{1,2})?$/.test(trimmed)) {
                setFormError(t('backend.refund.invalidAmount', 'Enter a positive amount with at most 2 decimals, or leave it empty for a full refund.'));
                return;
            }
            if (n > order.totalAmount + 0.005) {
                setFormError(t('backend.refund.tooLarge', 'The amount is larger than the order total.'));
                return;
            }
        }
        setFormError('');
        setStep('confirm');
    };

    const submit = async () => {
        setBusy(true);
        try {
            const res = await fetch('/api/payments/shamcash/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    ...(trimmed ? { amount: Number(trimmed) } : {}),
                    ...(note.trim() ? { note: note.trim() } : {}),
                    ...(retry && retry.amount === trimmed ? { idempotencyKey: retry.key } : {}),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setRetry(data.retryKey ? { key: data.retryKey, amount: trimmed } : null);
                throw new Error(data.error || 'Refund failed');
            }
            setRetry(null);
            toast({
                title: t('backend.refund.sent', 'Refund sent via ShamCash'),
                description: t('backend.refund.sentBody', 'Transaction {tranId}: {refunded} refunded. Left on this bill: {remaining}.', {
                    tranId: data.tranId,
                    refunded: money(data.refunded, order),
                    remaining: money(data.remaining, order),
                }),
            });
            setStep('closed');
            setAmount('');
            setNote('');
            onChanged();
        } catch (err: any) {
            toast({ variant: 'destructive', title: t('backend.refund.failed', 'Refund failed'), description: err.message });
            setStep('form');
        } finally {
            setBusy(false);
        }
    };

    if (step === 'closed') {
        return (
            <Button size="sm" variant="outline" onClick={() => setStep('form')}>
                {t('backend.refund.button', 'Refund via ShamCash')}
            </Button>
        );
    }

    return (
        <div className="w-full border-[2px] border-foreground p-3 space-y-2">
            <strong className="font-headline text-xs uppercase tracking-wider">{t('backend.refund.button', 'Refund via ShamCash')}</strong>
            {step === 'form' ? (
                <>
                    <div className="grid sm:grid-cols-2 gap-2">
                        <div className="grid gap-1">
                            <Label htmlFor={`refund-amount-${order.id}`} className="text-xs">{t('backend.refund.amountLabel', 'Amount (empty = full refund)')}</Label>
                            <Input
                                id={`refund-amount-${order.id}`}
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder={t('backend.refund.amountPlaceholder', 'Full: {total}', { total: order.totalAmount.toFixed(2) })}
                            />
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor={`refund-note-${order.id}`} className="text-xs">{t('backend.refund.reasonLabel', 'Reason (optional)')}</Label>
                            <Input id={`refund-note-${order.id}`} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
                        </div>
                    </div>
                    {formError && <p className="text-xs text-destructive" role="alert">{formError}</p>}
                    {retry && retry.amount === trimmed && (
                        <p className="text-xs">{t('backend.refund.retryHint', 'The last attempt timed out — submitting again safely retries the same refund.')}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={review}>{t('backend.refund.review', 'Review refund')}</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setStep('closed'); setFormError(''); }}>{t('backend.common.cancel', 'Cancel')}</Button>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-sm">
                        {t('backend.refund.confirm', "Refund {amount} to the customer's ShamCash wallet for order {ref}? This sends real money from your ShamCash business balance and cannot be undone.", {
                            amount: amountLabel,
                            ref: orderReference(order.id),
                        })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="destructive" disabled={busy} onClick={submit}>
                            {busy ? t('backend.refund.refunding', 'Refunding…') : t('backend.refund.confirmButton', 'Yes, refund now')}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStep('form')}>{t('backend.common.back', 'Back')}</Button>
                    </div>
                </>
            )}
        </div>
    );
};

/** Payment details + admin review actions for one order. */
const PaymentPanel = ({ order, isAdmin, onChanged }: { order: ListedOrder; isAdmin: boolean; onChanged: () => void }) => {
    const { toast } = useToast();
    const { t } = useTranslation();
    const money = useOrderMoney();
    const [busy, setBusy] = useState(false);
    const status = order.paymentStatus || 'pending';
    const isEpay = order.paymentMethod === 'sham_cash_epay';
    const isManual = MANUAL_PAYMENT_METHODS.includes(order.paymentMethod as PaymentMethodId);
    const epayRef = isEpay ? parseShamCashEpayReference(order.paymentReference) : null;
    const duplicates = order.referenceUsedOnOtherOrders || [];
    const cancelled = order.status === 'Cancelled';

    const act = async (action: 'mark_paid' | 'reject' | 'mark_refunded') => {
        if (
            action === 'mark_refunded' &&
            !window.confirm(t('backend.payment.confirmRefunded', 'Mark this payment as refunded? The order will be cancelled.'))
        ) return;
        if (
            action === 'mark_paid' &&
            duplicates.length > 0 &&
            !window.confirm(t('backend.payment.confirmDuplicate', 'This reference also appears on another order. Confirm only if you checked the transfer. Continue?'))
        ) return;
        setBusy(true);
        try {
            const res = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // expectedReference: the server refuses if the customer changed it meanwhile.
                body: JSON.stringify({ orderId: order.id, action, expectedReference: order.paymentReference || '' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed');
            toast({
                title: t('backend.payment.updated', 'Payment updated'),
                description: t('backend.payment.updatedBody', '{ref} is now {status}.', {
                    ref: orderReference(order.id),
                    status: paymentStatusLabel(t, data.paymentStatus),
                }),
            });
            onChanged();
        } catch (err: any) {
            toast({ variant: 'destructive', title: t('backend.payment.failed', 'Could not update payment'), description: err.message });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="text-sm bg-background p-4 rounded-md space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
                <span><strong>{t('backend.payment.method', 'Method:')}</strong> {paymentMethodLabel(order.paymentMethod, t)}</span>
                <PaymentStatusBadge status={status} method={order.paymentMethod} />
            </div>
            <p><strong>{t('backend.payment.amountDue', 'Amount due:')}</strong> <span className="font-mono">{money(order.totalAmount, order)}</span></p>
            {isEpay ? (
                <>
                    {isAdmin && epayRef ? (
                        <>
                            <p className="break-all"><strong>{t('backend.payment.shamCashBill', 'ShamCash bill:')}</strong> <span className="font-mono">{epayRef.billNo}</span></p>
                            <p className="break-all"><strong>{t('backend.payment.shamCashTransaction', 'ShamCash transaction:')}</strong> <span className="font-mono">{epayRef.tranId}</span></p>
                        </>
                    ) : (
                        <p className="text-xs text-muted-foreground">{t('backend.payment.epayAuto', 'Confirmed automatically by ShamCash when the customer pays.')}</p>
                    )}
                </>
            ) : (
                <>
                    <p><strong>{t('backend.payment.lookFor', 'Reference to look for:')}</strong> <span className="font-mono">{orderReference(order.id)}</span></p>
                    {isAdmin && (
                        <p className="break-all">
                            <strong>{t('backend.payment.customerReference', 'Customer transfer reference:')}</strong>{' '}
                            {order.paymentReference ? (
                                <span className="font-mono">{order.paymentReference}</span>
                            ) : (
                                <span className="text-muted-foreground">{t('backend.payment.none', 'none')}</span>
                            )}
                        </p>
                    )}
                </>
            )}
            {isAdmin && order.hasPaymentProof && (
                <p>
                    <a
                        href={`/api/payments/proof/view?orderId=${encodeURIComponent(order.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                    >
                        {t('backend.payment.viewScreenshot', 'View payment screenshot')}
                    </a>
                </p>
            )}
            {isAdmin && isManual && !order.paymentReference && !order.hasPaymentProof && status !== 'paid' && (
                <p className="text-xs text-muted-foreground">{t('backend.payment.nothingSent', 'The customer has not sent a reference or screenshot yet.')}</p>
            )}
            {isAdmin && duplicates.length > 0 && (
                <div className="flex items-start gap-2 border-[2px] border-destructive bg-destructive/10 p-2 text-foreground">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
                    <p className="text-xs">
                        <strong>{t('backend.payment.duplicateTitle', 'Same reference on another order.')}</strong>{' '}
                        {t('backend.payment.duplicateBody', 'Also used on: {orders}. One transfer can only pay one order — check the amount, sender and time in your bank or wallet before confirming.', {
                            orders: duplicates.map((d) => `${d.reference} (${paymentStatusLabel(t, d.paymentStatus)})`).join(', '),
                        })}
                    </p>
                </div>
            )}
            {!isAdmin && status !== 'paid' && order.paymentMethod && order.paymentMethod !== 'cod' && (
                <p className="text-destructive text-xs">{t('backend.payment.dontPrint', "Payment not confirmed yet — don't start printing until it shows Paid.")}</p>
            )}
            {isAdmin && (
                <div className="flex flex-wrap gap-2 pt-2">
                    {status !== 'paid' && status !== 'refunded' && (
                        <>
                            {!cancelled && (
                                <Button size="sm" disabled={busy} onClick={() => act('mark_paid')}>{t('backend.payment.markPaid', 'Mark paid')}</Button>
                            )}
                            {status !== 'failed' && (
                                <Button size="sm" variant="destructive" disabled={busy} onClick={() => act('reject')}>{t('backend.payment.reject', 'Reject payment')}</Button>
                            )}
                        </>
                    )}
                    {status === 'paid' && isEpay && <ShamCashRefund order={order} onChanged={onChanged} />}
                    {status === 'paid' && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act('mark_refunded')}>
                            {isEpay
                                ? t('backend.payment.markRefundedNoMoney', 'Mark refunded (no money sent)')
                                : t('backend.payment.markRefunded', 'Mark refunded')}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};

function OrdersList() {
    const { user } = useSessionUser();
    const { t } = useTranslation();
    const { toast } = useToast();
    const money = useOrderMoney();
    const isAdmin = user?.role === 'admin';
    const actor: OrderActor = isAdmin ? 'admin' : 'owner';
    const [reviewOnly, setReviewOnly] = useState(false);
    const [reconciling, setReconciling] = useState(false);
    const { orders, loading, loadingMore, error, hasMore, refresh, loadMore, patchOrder } = useOrderList(
        {
            status: LIST_STATUSES,
            paymentStatus: reviewOnly ? 'verifying' : undefined,
            scope: isAdmin ? undefined : 'assigned',
        },
        !!user
    );

    const reconcileShamCash = async () => {
        setReconciling(true);
        try {
            const res = await fetch('/api/payments/shamcash/reconcile');
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Check failed');
            if (data.configured === false) throw new Error(data.message || 'ShamCash online payment is not configured.');
            toast({
                title: t('backend.orders.shamCashChecked', 'ShamCash checked'),
                description: t('backend.orders.shamCashCheckedBody', '{checked} open bill(s) checked: {paid} paid, {expired} expired, {pending} still pending, {errors} error(s).', {
                    checked: data.checked || 0,
                    paid: data.paid || 0,
                    expired: data.expired || 0,
                    pending: data.stillPending || 0,
                    errors: data.errors || 0,
                }),
            });
            refresh();
        } catch (err: any) {
            toast({ variant: 'destructive', title: t('backend.orders.shamCashCheckFailed', 'ShamCash check failed'), description: err.message });
        } finally {
            setReconciling(false);
        }
    };

    const accept = (order: ListedOrder) =>
        patchOrder(order.id, { status: 'Pending' }).catch((err: any) =>
            toast({ variant: 'destructive', title: t('backend.orders.acceptFailed', 'Could not accept'), description: err.message })
        );
    const reject = (order: ListedOrder) =>
        patchOrder(order.id, { releaseToPool: true })
            .then(() => {
                toast({ title: t('backend.orders.released', 'Order released to the pool') });
                refresh();
            })
            .catch((err: any) =>
                toast({ variant: 'destructive', title: t('backend.orders.releaseFailed', 'Could not release the order'), description: err.message })
            );

    const toolbar = (
        <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Switch id="review-only" checked={reviewOnly} onCheckedChange={setReviewOnly} />
                <Label htmlFor="review-only">{t('backend.orders.reviewOnly', 'Only payments to review')}</Label>
            </div>
            {isAdmin && (
                <Button size="sm" variant="outline" disabled={reconciling} onClick={reconcileShamCash}>
                    {reconciling ? t('backend.orders.checking', 'Checking…') : t('backend.orders.checkShamCash', 'Check ShamCash payments')}
                </Button>
            )}
        </div>
    );

    if (loading) {
        return (
            <>
                {toolbar}
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </>
        )
    }

    if (error) {
        return (
            <>
                {toolbar}
                <div className="text-center py-16 space-y-4">
                    <p className="text-destructive" role="alert">{t('backend.orders.loadFailed', 'Could not load orders.')}</p>
                    <Button variant="outline" onClick={refresh}>{t('backend.common.retry', 'Try again')}</Button>
                </div>
            </>
        );
    }

    return orders.length > 0 ? (
        <>
        {toolbar}
        <Accordion type="single" collapsible className="w-full space-y-4">
            {orders.map((order) => (
                <AccordionItem value={order.id} key={order.id} className="bg-muted/50 rounded-lg">
                    <div className="flex items-center w-full flex-wrap gap-4 px-4 py-2">
                        <AccordionTrigger className="flex-1 hover:no-underline py-2">
                            <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-4 text-start [overflow-wrap:anywhere]">
                                <div>
                                    <span className="font-bold block sm:inline">{t('backend.orders.order', 'Order:')} </span>
                                    <span className="font-mono text-xs text-muted-foreground">{orderReference(order.id)}</span>
                                </div>
                                <div>
                                    <span className="font-bold block sm:inline">{t('backend.orders.customer', 'Customer:')} </span>
                                    <span>{order.shippingAddress.fullName}{order.customerEmail ? ` (${order.customerEmail})` : ''}</span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-4 py-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            <OrderStatusSelector order={order} actor={actor} onPatch={patchOrder} />
                            <PaymentStatusBadge status={order.paymentStatus} method={order.paymentMethod} />
                            {isAdmin && (order.referenceUsedOnOtherOrders?.length || 0) > 0 && (
                                <Badge variant="destructive">{t('backend.payment.duplicateBadge', 'Reference reused')}</Badge>
                            )}
                            <span className="font-bold text-lg">{money(order.totalAmount, order)}</span>
                        </div>
                    </div>
                    <AccordionContent className="px-4">
                        <div className="pt-4 border-t grid md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-semibold mb-2">{t('backend.orders.items', 'Items:')}</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('backend.orders.product', 'Product')}</TableHead>
                                            <TableHead>{t('backend.orders.qty', 'Qty')}</TableHead>
                                            <TableHead className="text-end">{t('backend.orders.price', 'Price')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {order.items.map((item, idx) => (
                                            <TableRow key={`${item.productId}-${idx}`}>
                                                <TableCell className="flex items-center gap-2">
                                                    <Image src={item.imageUrl || '/images/product-fallback.svg'} alt={item.name} width={40} height={40} className="rounded object-cover" />
                                                    <span>{item.name}</span>
                                                </TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell className="text-end">{money(item.price, order)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">{t('backend.orders.shipping', 'Shipping details:')}</h4>
                                    <div className="text-sm bg-background p-4 rounded-md">
                                        <p><strong>{t('backend.orders.name', 'Name:')}</strong> {order.shippingAddress.fullName}</p>
                                        <p><strong>{t('backend.orders.phone', 'Phone:')}</strong> <span dir="ltr">{order.phoneNumber}</span></p>
                                        <p>
                                            <strong>{t('backend.orders.address', 'Address:')}</strong>{' '}
                                            {[order.shippingAddress.addressLine1, order.shippingAddress.city, order.shippingAddress.postalCode, order.shippingAddress.country]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </p>
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
                                    <h4 className="font-semibold mb-2">{t('backend.orders.payment', 'Payment:')}</h4>
                                    <PaymentPanel order={order} isAdmin={isAdmin} onChanged={refresh} />
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">{t('backend.orders.management', 'Order management:')}</h4>
                                    <div className="text-sm bg-background p-4 rounded-md space-y-4">
                                        {order.status === 'AwaitingAcceptance' ? (
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" onClick={() => accept(order)}>
                                                    {t('backend.orders.accept', 'Accept')}
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => reject(order)}>
                                                    {t('backend.orders.reject', 'Reject (send to pool)')}
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <PredictedDateSelector order={order} onPatch={patchOrder} />
                                                {isAdmin && <PrioritizeSwitch order={order} onPatch={patchOrder} />}
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
        {hasMore && (
            <div className="flex justify-center pt-6">
                <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
                    {loadingMore ? t('backend.common.loading', 'Loading…') : t('backend.orders.loadMore', 'Load more orders')}
                </Button>
            </div>
        )}
        </>
    ) : (
        <>
        {toolbar}
        <div className="text-center py-16">
            <p className="text-muted-foreground">
                {reviewOnly
                    ? t('backend.orders.noneToReview', 'No payments waiting for review.')
                    : t('backend.orders.none', 'No orders found.')}
            </p>
        </div>
        </>
    );
}

export default function OrdersAdminPage() {
    const { user } = useSessionUser();
    const { t } = useTranslation();

    if (!user) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">{t('backend.orders.loginRequired', 'Please log in to view orders.')}</p>
            </div>
        )
    }

    if (user.role !== 'admin' && user.role !== 'store-owner') {
        return (
            <div className="text-center py-16">
                <h1 className="text-3xl font-bold tracking-tight">{t('backend.common.accessDenied', 'Access denied')}</h1>
                <p className="text-muted-foreground mt-4">{t('backend.common.noPermission', 'You do not have permission to view this page.')}</p>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('backend.orders.title', 'Orders')}</CardTitle>
                <CardDescription>
                    {user.role === 'admin'
                        ? t('backend.orders.descriptionAdmin', 'All orders, newest first. Pooled orders are on the Order Pool page.')
                        : t('backend.orders.descriptionOwner', 'Orders assigned to you, newest first.')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <OrdersList />
            </CardContent>
        </Card>
    );
}
