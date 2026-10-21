'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/components/language-provider';

type Translate = (key: string, fallback?: string, vars?: Record<string, string | number>) => string;

const METHOD_LABELS: Record<string, string> = {
  cod: 'Cash on delivery',
  bank_transfer: 'Bank transfer',
  sham_cash: 'Sham Cash',
  sham_cash_epay: 'ShamCash (online)',
  syriatel_cash: 'Syriatel Cash',
  stripe: 'Card',
};

/** Short payment-method name. Pass `t` (from useTranslation) for the translated label. */
export function paymentMethodLabel(method?: string | null, t?: Translate) {
  if (!method || !METHOD_LABELS[method]) return t ? t('paymentBadge.method.none', 'Not set') : 'Not set';
  return t ? t(`paymentBadge.method.${method}`, METHOD_LABELS[method]) : METHOD_LABELS[method];
}

/** Payment status pill used on customer, store-owner and admin order views. */
export function PaymentStatusBadge({ status, method }: { status?: string | null; method?: string | null }) {
  const { t } = useTranslation();
  const s = status || 'pending';
  const meta: Record<string, { label: string; variant: any }> = {
    paid: { label: t('paymentBadge.paid', 'Paid'), variant: 'printable' },
    verifying: { label: t('paymentBadge.verifying', 'Under review'), variant: 'sale' },
    failed: { label: t('paymentBadge.failed', 'Not confirmed'), variant: 'destructive' },
    refunded: { label: t('paymentBadge.refunded', 'Refunded'), variant: 'outline' },
    pending: {
      label: method === 'cod' ? t('paymentBadge.payOnDelivery', 'Pay on delivery') : t('paymentBadge.awaiting', 'Awaiting payment'),
      variant: 'outline',
    },
  };
  const m = meta[s] || { label: s, variant: 'outline' };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
