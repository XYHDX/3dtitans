'use client';

import { useCurrency } from '@/hooks/use-currency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/hooks/use-data';
import { useSessionUser } from '@/hooks/use-session';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PaymentStatusBadge } from '@/components/payment-status-badge';
import { useTranslation } from '@/components/language-provider';
import { formatMoney, orderReference } from '@/lib/payments/common';
import type { Order } from '@/lib/types';
import { CANCELLATION_REQUEST_FROM, ORDER_STATUSES } from '@/lib/orders/transitions';

// Every status, Pooled included: an order waiting in the shared production
// queue must not vanish from the customer's list.
const CUSTOMER_STATUSES = [...ORDER_STATUSES] as Order['status'][];

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, { label: string; variant: string }> = {
    AwaitingAcceptance: { label: t('ordersPage.status.AwaitingAcceptance', 'Awaiting acceptance'), variant: 'outline' },
    Pending: { label: t('ordersPage.status.Pending', 'Pending'), variant: 'secondary' },
    Printing: { label: t('ordersPage.status.Printing', 'Printing'), variant: 'default' },
    Finished: { label: t('ordersPage.status.Finished', 'Finished'), variant: 'printable' },
    // Internal "pool" = waiting for a print shop to pick it up.
    Pooled: { label: t('ordersPage.status.Pooled', 'In production queue'), variant: 'secondary' },
    CancellationRequested: { label: t('ordersPage.status.CancellationRequested', 'Cancellation requested'), variant: 'destructive' },
    Cancelled: { label: t('ordersPage.status.Cancelled', 'Cancelled'), variant: 'outline' },
  };
  const meta = map[status] || { label: status, variant: 'outline' };
  return <Badge variant={meta.variant as any}>{meta.label}</Badge>;
}

export default function UserOrdersPage() {
  const { currency } = useCurrency();
  const { user } = useSessionUser();
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  // In-page confirmation step for "Request cancellation" (no browser dialogs).
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { data: orders, loading, requestCancelOrder } = useOrders(
    { statusIn: CUSTOMER_STATUSES },
    { skipFetch: !user }
  );

  const dateFormatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SY-u-nu-latn' : 'en-GB', { dateStyle: 'medium' });
  const formatDate = (value: Order['orderDate'] | string | undefined) => {
    if (!value) return t('ordersPage.noDate', 'N/A');
    const raw = typeof value === 'object' && 'toDate' in value ? value.toDate() : new Date(value as any);
    const d = raw instanceof Date ? raw : new Date(raw);
    return isNaN(d.getTime()) ? t('ordersPage.noDate', 'N/A') : dateFormatter.format(d);
  };
  // Each order keeps the currency it was priced in; legacy orders use the store currency.
  const formatTotal = (order: Order) => formatMoney(order.totalAmount, (order as Order & { currency?: string | null }).currency || currency);
  const orderHref = (order: Order) => `/checkout/success?orderId=${encodeURIComponent(order.id)}`;

  async function confirmCancel(order: Order) {
    setCancelingId(order.id);
    const updated = await requestCancelOrder(order.id);
    if (updated) {
      toast({
        title: t('ordersPage.cancelRequestedTitle', 'Cancellation requested'),
        description: t('ordersPage.cancelRequestedDesc', 'The store will confirm your request soon.'),
      });
    } else {
      toast({
        variant: 'destructive',
        title: t('ordersPage.cancelFailedTitle', 'Unable to request cancellation'),
        description: t('ordersPage.cancelFailedDesc', 'Please try again or contact us.'),
      });
    }
    setCancelingId(null);
    setConfirmingId(null);
  }

  // Plain render function (not a component) so the row isn't remounted when the confirm step opens.
  function renderActions(order: Order) {
    if (order.status === 'CancellationRequested') {
      return <span className="text-muted-foreground text-sm">{t('ordersPage.awaitingApproval', 'Awaiting store approval')}</span>;
    }
    // Same rule as the API (src/lib/orders/transitions.ts): open orders only.
    if (!(CANCELLATION_REQUEST_FROM as string[]).includes(order.status)) {
      return <span className="text-muted-foreground text-sm">{t('ordersPage.noActions', 'No actions')}</span>;
    }
    if (confirmingId === order.id) {
      return (
        <div className="border-[2px] border-destructive p-2 space-y-2 text-sm" role="group" aria-label={t('ordersPage.confirmAria', 'Confirm cancellation')}>
          <p>{t('ordersPage.confirmText', 'Cancel order {ref}? The store will review your request.', { ref: orderReference(order.id) })}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelingId === order.id}
              onClick={() => confirmCancel(order)}
            >
              {cancelingId === order.id ? t('ordersPage.sending', 'Sending…') : t('ordersPage.confirmYes', 'Yes, request cancellation')}
            </Button>
            <Button variant="outline" size="sm" autoFocus disabled={cancelingId === order.id} onClick={() => setConfirmingId(null)}>
              {t('ordersPage.confirmNo', 'Keep order')}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirmingId(order.id)}>
        {t('ordersPage.requestCancel', 'Request cancellation')}
      </Button>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 space-y-4">
        <h1 className="font-headline text-2xl">{t('ordersPage.title', 'Your orders')}</h1>
        <p className="text-muted-foreground">{t('ordersPage.loginRequired', 'Please log in to view your orders.')}</p>
        <Button asChild>
          <Link href={`/login?next=${encodeURIComponent('/orders')}`}>{t('nav.login')}</Link>
        </Button>
      </div>
    );
  }

  if (user.role === 'store-owner') {
    return (
      <div className="text-center py-16 space-y-3">
        <h1 className="text-2xl font-headline text-destructive">{t('ordersPage.ownerTitle', 'Orders unavailable')}</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {t('ordersPage.ownerDesc', 'Store owner accounts cannot place orders. Switch to a customer account to track purchases.')}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild variant="secondary">
            <Link href="/store-dashboard">{t('nav.store')}</Link>
          </Button>
          <Button asChild>
            <Link href="/">{t('ordersPage.backHome', 'Back home')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const hasOrders = !!orders && orders.length > 0;

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>{t('ordersPage.title', 'Your orders')}</h1>
          </CardTitle>
          <CardDescription>{t('ordersPage.subtitle', 'Track the status of your prints. Tap an order number for payment details.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Phones: one stacked card per order. */}
          <div className="md:hidden space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
            ) : hasOrders ? (
              orders.map((order) => (
                <article key={order.id} className="border-[2px] border-foreground p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={orderHref(order)} className="font-mono text-sm font-bold underline decoration-primary decoration-2 underline-offset-2" dir="ltr">
                        {orderReference(order.id)}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(order.orderDate)}</p>
                    </div>
                    <p className="font-bold shrink-0"><span dir="ltr">{formatTotal(order)}</span></p>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground mb-1">{t('ordersPage.colStatus', 'Status')}</dt>
                      <dd><StatusBadge status={order.status} /></dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground mb-1">{t('ordersPage.colPayment', 'Payment')}</dt>
                      <dd>
                        <Link href={orderHref(order)}>
                          <PaymentStatusBadge status={order.paymentStatus} method={order.paymentMethod} />
                        </Link>
                      </dd>
                    </div>
                  </dl>
                  {renderActions(order)}
                </article>
              ))
            ) : (
              <p className="text-center text-sm py-6">{t('ordersPage.empty', 'No orders yet.')}</p>
            )}
          </div>

          {/* Tablets and up: table. */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t('ordersPage.colOrder', 'Order')}</TableHead>
                  <TableHead className="text-start">{t('ordersPage.colDate', 'Date')}</TableHead>
                  <TableHead className="text-start">{t('ordersPage.colStatus', 'Status')}</TableHead>
                  <TableHead className="text-start">{t('ordersPage.colPayment', 'Payment')}</TableHead>
                  <TableHead className="text-start">{t('ordersPage.colActions', 'Actions')}</TableHead>
                  <TableHead className="text-end">{t('ordersPage.colTotal', 'Total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-end"><Skeleton className="h-5 w-16 ms-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : hasOrders ? (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={orderHref(order)} className="underline decoration-primary decoration-2 underline-offset-2" dir="ltr">
                          {orderReference(order.id)}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell>
                        <Link href={orderHref(order)}>
                          <PaymentStatusBadge status={order.paymentStatus} method={order.paymentMethod} />
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {renderActions(order)}
                      </TableCell>
                      <TableCell className="text-end"><span dir="ltr">{formatTotal(order)}</span></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">{t('ordersPage.empty', 'No orders yet.')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
