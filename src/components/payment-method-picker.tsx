'use client';

import { Banknote, Building2, Smartphone, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePaymentSettings, type PaymentMethod } from '@/hooks/use-payment-settings';

type MethodConfig = {
  id: PaymentMethod;
  label: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ALL: MethodConfig[] = [
  { id: 'cod',            label: 'Cash on Delivery', blurb: 'Pay in cash when the order arrives at your door.',           icon: Banknote },
  { id: 'bank_transfer',  label: 'Bank Transfer',    blurb: 'Transfer to our bank account. We confirm and ship.',         icon: Building2 },
  { id: 'sham_cash',      label: 'Sham Cash',        blurb: 'Pay via Sham Cash wallet, then upload a screenshot.',        icon: Smartphone },
  { id: 'syriatel_cash',  label: 'Syriatel Cash',    blurb: 'Pay via Syriatel Cash wallet, then upload a screenshot.',    icon: Smartphone },
  { id: 'stripe',         label: 'Card payment',     blurb: 'Pay with Visa / Mastercard via Stripe (international).',     icon: CreditCard },
];

export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod | '';
  onChange: (m: PaymentMethod) => void;
}) {
  const { settings, loading } = usePaymentSettings();

  const enabledMap: Record<PaymentMethod, boolean> = {
    cod:            settings.codEnabled,
    bank_transfer:  settings.bankEnabled,
    sham_cash:      settings.shamCashEnabled,
    syriatel_cash:  settings.syriatelCashEnabled,
    stripe:         settings.stripeEnabled,
  };

  const visible = ALL.filter((m) => enabledMap[m.id]);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-[3px] border-foreground/20 p-4 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="border-[3px] border-dashed border-foreground/30 p-4 text-sm text-muted-foreground">
        No payment methods configured. An admin must enable at least one method in settings.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Payment method">
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
              'text-left border-[3px] border-foreground p-4 transition-transform [transition-timing-function:steps(2,end)] duration-75',
              'hover:-translate-x-[2px] hover:-translate-y-[2px]',
              selected
                ? 'bg-accent text-accent-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]'
                : 'bg-background text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_0_hsl(var(--foreground))]'
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={cn('h-8 w-8 grid place-items-center border-[2px] border-foreground', selected ? 'bg-background' : 'bg-accent')}>
                <Icon className={cn('h-4 w-4', selected ? 'text-foreground' : 'text-accent-foreground')} />
              </div>
              <span className="font-headline text-sm">{m.label}</span>
            </div>
            <p className="text-xs leading-snug">{m.blurb}</p>
          </button>
        );
      })}
    </div>
  );
}
