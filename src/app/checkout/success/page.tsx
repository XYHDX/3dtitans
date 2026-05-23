'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Banknote, Building2, Smartphone, CreditCard, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePaymentSettings, type PaymentMethod } from '@/hooks/use-payment-settings';
import { ProofUploader } from '@/components/proof-uploader';

type OrderDetails = {
  id: string;
  totalAmount: number;
  paymentMethod: PaymentMethod | null;
  paymentStatus: string;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  status: string;
  shippingAddress: { fullName: string; addressLine1: string; city: string; postalCode: string; country: string };
  items: Array<{ name: string; quantity: number; price: number }>;
};

function CopyableField({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-[2px] border-foreground bg-background px-3 py-2">
      <div className="min-w-0">
        <div className="text-[10px] font-headline uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-mono text-sm break-all">{value}</div>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value).then(() => toast({ title: 'Copied' }));
        }}
        aria-label={`Copy ${label}`}
        className="border-[2px] border-foreground bg-background p-2 hover:bg-accent shrink-0"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const { settings } = usePaymentSettings();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) {
      setError('Missing order ID');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error('Could not load order');
        const data = await res.json();
        if (!cancelled) setOrder(data.order);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-3xl">
        <Skeleton className="h-12 w-2/3 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-3xl">
        <div className="border-[3px] border-dashed border-foreground/30 p-10 text-center">
          <p className="mb-4">{error || 'Order not found.'}</p>
          <Button asChild><Link href="/">Back to home</Link></Button>
        </div>
      </div>
    );
  }

  const currency = settings.currencyLabel || 'USD';
  const method = order.paymentMethod;
  const paid = order.paymentStatus === 'paid';

  return (
    <div className="container mx-auto py-12 px-4 max-w-3xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-grid place-items-center h-16 w-16 border-[4px] border-foreground bg-accent text-accent-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] mb-5">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="font-headline text-3xl md:text-4xl">Order Placed!</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Order <span className="font-mono font-bold">#{order.id.slice(-8).toUpperCase()}</span> &middot; {paid ? 'Paid' : 'Awaiting payment'}
        </p>
      </div>

      {/* Order summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span>{item.name} × {item.quantity}</span>
                <span className="font-mono">{currency} {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t-[3px] border-foreground pt-3 flex justify-between font-headline text-base">
            <span>TOTAL</span>
            <span>{currency} {order.totalAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Method-specific payment instructions */}
      <PaymentInstructions order={order} currency={currency} />

      {/* Shipping confirmation */}
      <Card className="mt-6">
        <CardHeader><CardTitle className="text-xl font-headline">Shipping To</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <p className="font-bold">{order.shippingAddress.fullName}</p>
          <p>{order.shippingAddress.addressLine1}</p>
          <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
          <p>{order.shippingAddress.country}</p>
        </CardContent>
      </Card>

      <div className="flex gap-3 mt-8 flex-wrap">
        <Button asChild><Link href="/orders">View my orders</Link></Button>
        <Button asChild variant="outline"><Link href="/products">Keep shopping</Link></Button>
      </div>
    </div>
  );
}

function PaymentInstructions({ order, currency }: { order: OrderDetails; currency: string }) {
  const { settings } = usePaymentSettings();
  const method = order.paymentMethod;
  const paid = order.paymentStatus === 'paid';

  if (paid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--pixel-green))]" /> Payment Received
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          Your payment has been confirmed. We&rsquo;ll start processing your order shortly.
        </CardContent>
      </Card>
    );
  }

  if (method === 'cod') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-3">
            <Banknote className="h-5 w-5" /> Cash on Delivery
          </CardTitle>
          <CardDescription>Pay {currency} {order.totalAmount.toFixed(2)} in cash when your order arrives.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Please have the exact amount ready for our courier.</p>
          <Badge variant="creator">DELIVERY NOTE</Badge>
          <p>You&rsquo;ll receive a phone call before delivery to confirm the time slot.</p>
        </CardContent>
      </Card>
    );
  }

  if (method === 'bank_transfer') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-3">
            <Building2 className="h-5 w-5" /> Bank Transfer Details
          </CardTitle>
          <CardDescription>Transfer {currency} {order.totalAmount.toFixed(2)} to the account below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyableField label="Bank" value={settings.bankName} />
          <CopyableField label="Account holder" value={settings.bankAccountHolder} />
          <CopyableField label="Account number" value={settings.bankAccountNumber} />
          <CopyableField label="IBAN" value={settings.bankIban} />
          <CopyableField label="Reference (use this)" value={order.id.slice(-8).toUpperCase()} />
          <p className="text-xs text-muted-foreground mt-2">
            Put the reference in the transfer description so we can match it to your order. Once we see the transfer, we&rsquo;ll mark it paid and start processing.
          </p>
          <ProofUploader orderId={order.id} />
        </CardContent>
      </Card>
    );
  }

  if (method === 'sham_cash' || method === 'syriatel_cash') {
    const isSham = method === 'sham_cash';
    const number = isSham ? settings.shamCashNumber : settings.syriatelCashNumber;
    const name = isSham ? 'Sham Cash' : 'Syriatel Cash';
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-3">
            <Smartphone className="h-5 w-5" /> {name} Payment
          </CardTitle>
          <CardDescription>Send {currency} {order.totalAmount.toFixed(2)} to the number below, then upload a screenshot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyableField label={`${name} number`} value={number} />
          <CopyableField label="Reference (use this)" value={order.id.slice(-8).toUpperCase()} />
          <ProofUploader orderId={order.id} />
        </CardContent>
      </Card>
    );
  }

  if (method === 'stripe') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-3">
            <CreditCard className="h-5 w-5" /> Card Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>If you weren&rsquo;t redirected to Stripe, payment may not have been completed. Please check your card statement or contact support.</p>
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
