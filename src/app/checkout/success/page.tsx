'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Banknote, Building2, Smartphone, CreditCard, Copy, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePaymentSettings, type PaymentMethod, type PaymentSettings } from '@/hooks/use-payment-settings';
import { ProofUploader } from '@/components/proof-uploader';
import { ShamCashEpayPanel } from '@/components/shamcash-epay-panel';
import { DeliveryNote, newOrderFlagKey } from '@/components/delivery-note';
import { useGovernorateLabel } from '@/components/governorate-select';
import { useTranslation } from '@/components/language-provider';
import { formatMoney, orderReference } from '@/lib/payments/common';
import { track } from '@/lib/analytics';

type OrderDetails = {
  id: string;
  totalAmount: number;
  /** Currency the order was priced in (null on legacy orders → store currency). */
  currency?: string | null;
  orderDate?: string;
  paymentMethod: PaymentMethod | null;
  paymentStatus: string;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  status: string;
  shippingAddress: { fullName: string; addressLine1: string; city: string; postalCode: string | null; country: string };
  items: Array<{ productId?: string; name: string; quantity: number; price: number }>;
};

const PURCHASE_TRACKED_KEY = (orderId: string) => `3dt_purchase_${orderId}`;
/** Fallback when the "just placed" flag is missing (e.g. back from ShamCash in a new tab). */
const PURCHASE_WINDOW_MS = 24 * 60 * 60 * 1000;

function CopyableField({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-[2px] border-foreground bg-background px-3 py-2">
      <div className="min-w-0">
        <div className="text-[10px] font-headline uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-mono text-sm break-all" dir="ltr">{value}</div>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value).then(() => toast({ title: t('checkoutSuccess.copied', 'Copied') }));
        }}
        aria-label={t('checkoutSuccess.copyLabel', 'Copy {label}', { label })}
        className="border-[2px] border-foreground bg-background p-2 hover:bg-accent hover:text-accent-foreground shrink-0"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  // Set by the ShamCash redirectUrl when the customer comes back from paying.
  const shamCashReturn = searchParams.get('shamcash') === 'return';
  const { settings, loading: settingsLoading } = usePaymentSettings();
  const { t } = useTranslation();
  const governorateLabel = useGovernorateLabel();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<[string, string] | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError(['checkoutSuccess.missingId', 'We could not find this order. Please open it from "My orders".']);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (!res.ok) {
          console.warn('Order load failed', res.status);
          if (!cancelled) {
            setError(
              res.status === 404 || res.status === 403
                ? ['checkoutSuccess.notFound', 'We could not find this order. Please open it from "My orders".']
                : ['checkoutSuccess.loadFailed', "We couldn't load your order right now. Please refresh the page in a moment."]
            );
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) setOrder(data.order);
      } catch (e) {
        console.error('Order load failed', e);
        if (!cancelled) setError(['checkoutSuccess.loadFailed', "We couldn't load your order right now. Please refresh the page in a moment."]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  // Analytics: one `purchase` per order — only for a just-placed order (flag set
  // by checkout) or one created in the last 24 h, deduplicated per browser tab.
  const purchaseSent = useRef(false);
  useEffect(() => {
    if (!order || purchaseSent.current) return;
    if (order.status === 'Cancelled' || order.status === 'CancellationRequested') return;
    if (!order.currency && settingsLoading) return; // wait for the store currency
    purchaseSent.current = true;
    try {
      if (sessionStorage.getItem(PURCHASE_TRACKED_KEY(order.id))) return;
      const justPlaced = sessionStorage.getItem(newOrderFlagKey(order.id)) === '1';
      const createdAt = order.orderDate ? new Date(order.orderDate).getTime() : NaN;
      const recent = Number.isFinite(createdAt) && Date.now() - createdAt < PURCHASE_WINDOW_MS;
      if (!justPlaced && !recent) return;
      sessionStorage.setItem(PURCHASE_TRACKED_KEY(order.id), '1');
      sessionStorage.removeItem(newOrderFlagKey(order.id));
    } catch {
      // Storage blocked (private mode): still report once for this page view.
    }
    track('purchase', {
      currency: order.currency || settings.currencyLabel || 'USD',
      value: order.totalAmount,
      transaction_id: order.id,
      items: order.items.map((it) => ({
        item_id: it.productId || it.name,
        item_name: it.name,
        price: it.price,
        quantity: it.quantity,
      })),
    });
  }, [order, settingsLoading, settings.currencyLabel]);

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-3xl">
        <Skeleton className="h-12 w-2/3 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (error || !order) {
    const message = error || (['checkoutSuccess.notFound', 'We could not find this order. Please open it from "My orders".'] as [string, string]);
    return (
      <div className="container mx-auto py-12 px-4 max-w-3xl">
        <div className="border-[3px] border-dashed border-foreground/30 p-10 text-center">
          <h1 className="font-headline text-xl mb-3">{t('checkoutSuccess.errorTitle', 'Order not available')}</h1>
          <p className="mb-4" role="alert">{t(message[0], message[1])}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button asChild><Link href="/orders">{t('checkoutSuccess.viewOrders', 'View my orders')}</Link></Button>
            <Button asChild variant="outline"><Link href="/">{t('checkoutSuccess.backHome', 'Back to home')}</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  // Order currency first (fixed at creation), then the store currency.
  const currency = order.currency || settings.currencyLabel || 'USD';
  const method = order.paymentMethod;
  const paid = order.paymentStatus === 'paid';
  const ref = orderReference(order.id);
  const isCancelled = order.status === 'Cancelled';
  const cancelRequested = order.status === 'CancellationRequested';

  const paymentLabel = paid
    ? t('paymentBadge.paid', 'Paid')
    : order.paymentStatus === 'verifying'
    ? t('checkoutSuccess.statusVerifying', 'Payment under review')
    : order.paymentStatus === 'refunded'
    ? t('paymentBadge.refunded', 'Refunded')
    : order.paymentStatus === 'failed'
    ? t('checkoutSuccess.statusFailed', 'Payment not confirmed')
    : method === 'cod'
    ? t('paymentBadge.payOnDelivery', 'Pay on delivery')
    : t('paymentBadge.awaiting', 'Awaiting payment');

  return (
    <div className="container mx-auto py-12 px-4 max-w-3xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div
          className={
            'inline-grid place-items-center h-16 w-16 border-[4px] border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] mb-5 ' +
            (isCancelled || cancelRequested ? 'bg-background text-foreground' : 'bg-accent text-accent-foreground')
          }
          aria-hidden="true"
        >
          {isCancelled ? <XCircle className="h-8 w-8" /> : cancelRequested ? <Clock className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
        </div>
        <h1 className="font-headline text-3xl md:text-4xl">
          {isCancelled
            ? t('checkoutSuccess.cancelledTitle', 'Order cancelled')
            : cancelRequested
            ? t('checkoutSuccess.cancelRequestedTitle', 'Cancellation requested')
            : t('checkoutSuccess.title', 'Order placed!')}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          {t('checkoutSuccess.orderLabel', 'Order')} <span className="font-mono font-bold" dir="ltr">{ref}</span>
          {!isCancelled && !cancelRequested && <> &middot; {paymentLabel}</>}
        </p>
      </div>

      {/* Order summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl font-headline">
            <h2>{t('checkout.summaryTitle', 'Order Summary')}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between gap-3">
                <span>{item.name} × {item.quantity}</span>
                <span className="font-mono shrink-0" dir="ltr">{formatMoney(item.price * item.quantity, currency)}</span>
              </div>
            ))}
          </div>
          <div className="border-t-[3px] border-foreground pt-3 flex justify-between font-headline text-base">
            <span>{t('checkoutSuccess.total', 'Total')}</span>
            <span dir="ltr">{formatMoney(order.totalAmount, currency)}</span>
          </div>
        </CardContent>
      </Card>

      {isCancelled || cancelRequested ? (
        // Cancelled orders never show payment instructions or pay buttons.
        <Card role="status">
          <CardHeader>
            <CardTitle className="text-xl font-headline">
              <h2>
                {isCancelled
                  ? t('checkoutSuccess.cancelledTitle', 'Order cancelled')
                  : t('checkoutSuccess.cancelRequestedTitle', 'Cancellation requested')}
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {isCancelled ? (
              <>
                <p>{t('checkoutSuccess.cancelledDesc', 'This order was cancelled, so there is nothing to pay.')}</p>
                {order.paymentStatus === 'refunded' ? (
                  <p>{t('checkoutSuccess.cancelledRefunded', 'Your payment has been refunded.')}</p>
                ) : paid || order.paymentStatus === 'verifying' ? (
                  <p>{t('checkoutSuccess.cancelledRefundNote', "If you already paid, we'll contact you about your refund. Please keep your order number.")}</p>
                ) : null}
              </>
            ) : (
              <p>
                {t(
                  'checkoutSuccess.cancelRequestedDesc',
                  "We received your cancellation request and the store will confirm it soon. Please don't send any payment for this order."
                )}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Method-specific payment instructions */}
          <PaymentInstructions
            order={order}
            settings={settings}
            currency={currency}
            shamCashReturn={shamCashReturn}
            onStatusChange={(paymentStatus) => setOrder((o) => (o ? { ...o, paymentStatus } : o))}
          />
          <DeliveryNote className="mt-6" />
        </>
      )}

      {/* Keep the order number (we don't promise an email: it may not be configured). */}
      <p className="mt-6 text-sm border-[2px] border-dashed border-foreground/40 p-3">
        {t('checkoutSuccess.keepNumber', 'Please keep your order number {ref}. You can follow this order any time from "My orders", and you will need the number if you contact us.', { ref })}
      </p>

      {/* Shipping confirmation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-xl font-headline">
            <h2>{t('checkoutSuccess.shippingTo', 'Delivering to')}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-bold">{order.shippingAddress.fullName}</p>
          <p>{order.shippingAddress.addressLine1}</p>
          <p>
            {[governorateLabel(order.shippingAddress.city), order.shippingAddress.postalCode].filter(Boolean).join(', ')}
          </p>
          <p>{order.shippingAddress.country}</p>
        </CardContent>
      </Card>

      <div className="flex gap-3 mt-8 flex-wrap">
        <Button asChild><Link href="/orders">{t('checkoutSuccess.viewOrders', 'View my orders')}</Link></Button>
        <Button asChild variant="outline"><Link href="/products">{t('checkoutSuccess.keepShopping', 'Keep shopping')}</Link></Button>
      </div>
    </div>
  );
}

function PaymentInstructions({
  order,
  settings,
  currency,
  shamCashReturn,
  onStatusChange,
}: {
  order: OrderDetails;
  settings: PaymentSettings;
  currency: string;
  shamCashReturn: boolean;
  onStatusChange: (status: string) => void;
}) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [payingCard, setPayingCard] = useState(false);
  const method = order.paymentMethod;
  const paid = order.paymentStatus === 'paid';
  const ref = orderReference(order.id);
  const amount = formatMoney(order.totalAmount, currency);
  const failedNote =
    order.paymentStatus === 'failed' ? (
      <p className="text-xs text-destructive border-[2px] border-destructive p-2">
        {t('checkoutSuccess.failedNote', "We couldn't confirm your previous payment. Please check the amount and reference, then submit again.")}
      </p>
    ) : null;

  if (order.paymentStatus === 'refunded') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline">
            <h2>{t('checkoutSuccess.refundedTitle', 'Payment refunded')}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">{t('checkoutSuccess.refundedDesc', 'This order was cancelled and your payment refunded.')}</CardContent>
      </Card>
    );
  }

  // ShamCash online payment: pay / wait-for-confirmation / paid states (translated).
  if (method === 'sham_cash_epay') {
    return (
      <ShamCashEpayPanel
        orderId={order.id}
        totalAmount={order.totalAmount}
        currency={currency}
        paymentStatus={order.paymentStatus}
        orderStatus={order.status}
        returning={shamCashReturn}
        onStatusChange={onStatusChange}
      />
    );
  }

  if (paid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--pixel-green))]" aria-hidden="true" />
            <h2>{t('checkoutSuccess.paidTitle', 'Payment received')}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {t('checkoutSuccess.paidDesc', "Your payment has been confirmed. We'll start processing your order shortly.")}
        </CardContent>
      </Card>
    );
  }

  if (method === 'cod') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-3">
            <Banknote className="h-5 w-5" aria-hidden="true" />
            <h2>{t('payment.methods.cod.label', 'Cash on Delivery')}</h2>
          </CardTitle>
          <CardDescription>
            {t('checkoutSuccess.codDesc', 'Pay {amount} in cash when your order arrives.', { amount })}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>{t('checkoutSuccess.codExact', 'Please have the exact amount ready for our courier.')}</p>
        </CardContent>
      </Card>
    );
  }

  if (method === 'bank_transfer') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-3">
            <Building2 className="h-5 w-5" aria-hidden="true" />
            <h2>{t('checkoutSuccess.bankTitle', 'Bank transfer details')}</h2>
          </CardTitle>
          <CardDescription>{t('checkoutSuccess.bankDesc', 'Transfer {amount} to the account below.', { amount })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyableField label={t('checkoutSuccess.bankName', 'Bank')} value={settings.bankName} />
          <CopyableField label={t('checkoutSuccess.bankHolder', 'Account holder')} value={settings.bankAccountHolder} />
          <CopyableField label={t('checkoutSuccess.bankAccount', 'Account number')} value={settings.bankAccountNumber} />
          <CopyableField label="IBAN" value={settings.bankIban} />
          <CopyableField label={t('checkoutSuccess.bankReference', 'Reference (use this)')} value={ref} />
          <p className="text-xs text-muted-foreground mt-2">
            {t(
              'checkoutSuccess.bankNote',
              "Put the reference in the transfer description so we can match it to your order. Once we see the transfer, we'll mark it paid and start processing."
            )}
          </p>
          {failedNote}
          <ProofUploader orderId={order.id} method={method} paymentStatus={order.paymentStatus} onStatusChange={onStatusChange} />
        </CardContent>
      </Card>
    );
  }

  if (method === 'sham_cash' || method === 'syriatel_cash') {
    const isSham = method === 'sham_cash';
    const number = isSham ? settings.shamCashNumber : settings.syriatelCashNumber;
    const name = isSham ? t('paymentBadge.method.sham_cash', 'Sham Cash') : t('paymentBadge.method.syriatel_cash', 'Syriatel Cash');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-3">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
            <h2>{t('checkoutSuccess.walletTitle', '{name} payment', { name })}</h2>
          </CardTitle>
          <CardDescription>
            {t('checkoutSuccess.walletDesc', 'Send exactly {amount} to the number below, then upload a screenshot.', { amount })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyableField label={t('checkoutSuccess.walletNumber', '{name} number', { name })} value={number} />
          <CopyableField label={t('checkoutSuccess.amount', 'Amount')} value={amount} />
          <CopyableField label={t('checkoutSuccess.walletNoteLabel', 'Write this in the transfer note')} value={ref} />
          <p className="text-xs text-muted-foreground">
            {t(
              'checkoutSuccess.walletNote',
              'Put the reference in the transfer note so we can match the payment to your order. We confirm it manually.'
            )}
          </p>
          {failedNote}
          <ProofUploader
            orderId={order.id}
            method={method}
            paymentStatus={order.paymentStatus}
            onStatusChange={onStatusChange}
          />
        </CardContent>
      </Card>
    );
  }

  if (method === 'stripe') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-3">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
            <h2>{t('payment.methods.stripe.label', 'Card payment')}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          {order.paymentStatus === 'verifying' ? (
            <p>
              {t(
                'checkoutSuccess.cardProcessing',
                "Your card payment is being processed. Check this page or \"My orders\" for the confirmation."
              )}
            </p>
          ) : (
            <>
              <p>{t('checkoutSuccess.cardUnpaid', "This order hasn't been paid yet.")}</p>
              <Button
                disabled={payingCard}
                onClick={async () => {
                  setPayingCard(true);
                  try {
                    const res = await fetch('/api/payments/stripe/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId: order.id }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok && data.url) {
                      window.location.href = data.url;
                      return;
                    }
                    console.error('Stripe checkout failed:', res.status, data?.error);
                    toast({
                      variant: 'destructive',
                      title: t('checkout.cardUnavailableTitle', 'Card payment unavailable'),
                      description: t('checkoutSuccess.cardRetryLater', 'Please try again later, or contact us to pay another way.'),
                    });
                  } catch (e) {
                    console.error('Stripe checkout failed:', e);
                    toast({
                      variant: 'destructive',
                      title: t('checkout.cardUnavailableTitle', 'Card payment unavailable'),
                      description: t('checkoutSuccess.cardRetryLater', 'Please try again later, or contact us to pay another way.'),
                    });
                  } finally {
                    setPayingCard(false);
                  }
                }}
              >
                {payingCard
                  ? t('checkoutSuccess.redirecting', 'Redirecting…')
                  : t('checkoutSuccess.payByCard', 'Pay {amount} by card', { amount })}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-12 px-4"><Skeleton className="h-40 w-full" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
