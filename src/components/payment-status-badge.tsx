import { Badge } from '@/components/ui/badge';

const METHOD_LABELS: Record<string, string> = {
  cod: 'Cash on delivery',
  bank_transfer: 'Bank transfer',
  sham_cash: 'Sham Cash',
  syriatel_cash: 'Syriatel Cash',
  stripe: 'Card',
};

export function paymentMethodLabel(method?: string | null) {
  return (method && METHOD_LABELS[method]) || 'Not set';
}

/** Payment status pill used on customer, store-owner and admin order views. */
export function PaymentStatusBadge({ status, method }: { status?: string | null; method?: string | null }) {
  const s = status || 'pending';
  const meta: Record<string, { label: string; variant: any }> = {
    paid: { label: 'Paid', variant: 'printable' },
    verifying: { label: 'Under review', variant: 'sale' },
    failed: { label: 'Not confirmed', variant: 'destructive' },
    refunded: { label: 'Refunded', variant: 'outline' },
    pending: { label: method === 'cod' ? 'Pay on delivery' : 'Awaiting payment', variant: 'outline' },
  };
  const m = meta[s] || { label: s, variant: 'outline' };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
