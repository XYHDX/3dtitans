'use client';

import Link from 'next/link';
import { Banknote, Building2, Smartphone, CreditCard, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePaymentSettings, type PaymentMethod } from '@/hooks/use-payment-settings';
import { useTranslation } from '@/components/language-provider';

type MethodConfig = {
  id: PaymentMethod;
  /** English fallbacks; translations live in src/lib/i18n.ts (payment.methods.<id>.*). */
  label: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ALL: MethodConfig[] = [
  { id: 'cod',            label: 'Cash on Delivery',            blurb: 'Pay in cash when the order arrives at your door.',           icon: Banknote },
  { id: 'bank_transfer',  label: 'Bank Transfer',               blurb: 'Transfer to our bank account. We confirm and ship.',         icon: Building2 },
  { id: 'sham_cash_epay', label: 'ShamCash — pay online',       blurb: "You'll be taken to the ShamCash app or website to confirm the payment with your transfer code. Confirmed instantly.", icon: Zap },
  { id: 'sham_cash',      label: 'Sham Cash (manual transfer)', blurb: 'Send the amount to our Sham Cash wallet, then upload a screenshot. We confirm it manually.', icon: Smartphone },
  { id: 'syriatel_cash',  label: 'Syriatel Cash',               blurb: 'Pay via Syriatel Cash wallet, then upload a screenshot.',    icon: Smartphone },
  { id: 'stripe',         label: 'Card payment',                blurb: 'Pay with Visa / Mastercard via Stripe (international).',     icon: CreditCard },
];

export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod | '';
  onChange: (m: PaymentMethod) => void;
}) {
  const { settings, loading, reload } = usePaymentSettings();
  const { t } = useTranslation();

  const enabledMap: Record<PaymentMethod, boolean> = {
    cod:            settings.codEnabled,
    bank_transfer:  settings.bankEnabled,
    sham_cash:      settings.shamCashEnabled,
    sham_cash_epay: settings.shamCashEpayEnabled,
    syriatel_cash:  settings.syriatelCashEnabled,
    stripe:         settings.stripeEnabled,
  };

  const visible = ALL.filter((m) => enabledMap[m.id]);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-3" aria-busy="true" aria-label={t('payment.methods.loading', 'Loading payment methods')}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-[3px] border-foreground/20 p-4 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  // Settings failed to load or nothing is switched on: never show admin-facing
  // text to customers — a friendly note, a retry and a way to reach us.
  if (visible.length === 0) {
    return (
      <div className="border-[3px] border-dashed border-foreground/30 p-4 text-sm space-y-3" role="status">
        <p className="font-bold">{t('paymentPicker.unavailableTitle', 'Payment options are temporarily unavailable')}</p>
        <p className="text-muted-foreground">
          {t('paymentPicker.unavailableDesc', 'Please try again in a moment. If it keeps happening, contact us and we will help you complete your order.')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={reload}>
            <RefreshCw className="h-4 w-4" />
            {t('paymentPicker.retry', 'Try again')}
          </Button>
          <Button asChild type="button" variant="ghost" size="sm">
            <Link href="/about">{t('paymentPicker.contact', 'Contact us')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t('payment.methods.aria', 'Payment method')}>
      {visible.map((m) => {
        const selected = value === m.id;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(m.id)}
            className={cn(
              'min-w-0 text-start border-[3px] border-foreground p-4 transition-transform [transition-timing-function:steps(2,end)] duration-75',
              'hover:-translate-x-[2px] hover:-translate-y-[2px]',
              selected
                ? 'bg-accent text-accent-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]'
                : 'bg-background text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_0_hsl(var(--foreground))]'
            )}
          >
            <div className="flex min-w-0 items-center gap-3 mb-2">
              <div className={cn('h-8 w-8 grid place-items-center border-[2px] border-foreground shrink-0', selected ? 'bg-background' : 'bg-accent')}>
                <Icon className={cn('h-4 w-4', selected ? 'text-foreground' : 'text-accent-foreground')} />
              </div>
              <span className="min-w-0 font-headline text-sm leading-snug [overflow-wrap:anywhere]">{t(`payment.methods.${m.id}.label`, m.label)}</span>
            </div>
            <p className="text-xs leading-snug">{t(`payment.methods.${m.id}.blurb`, m.blurb)}</p>
          </button>
        );
      })}
    </div>
  );
}
