'use client';

import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/language-provider';

/**
 * "Delivery" note for checkout and the order page: the delivery fee and time
 * are confirmed with the customer by phone / WhatsApp after the order.
 */
export function DeliveryNote({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('border-[2px] border-foreground bg-background p-3 text-sm', className)}>
      <div className="flex items-center gap-2 mb-1">
        <Truck className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
        <strong className="font-headline text-xs uppercase tracking-wider">{t('delivery.title', 'Delivery')}</strong>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          'delivery.note',
          "The delivery fee isn't included in this total. We'll confirm the fee and delivery time with you by phone or WhatsApp after you order."
        )}
      </p>
    </div>
  );
}

/**
 * sessionStorage key set by checkout right after an order is created, so the
 * success page reports the analytics `purchase` only for a just-placed order
 * (not when an old order is opened from "My orders").
 */
export const newOrderFlagKey = (orderId: string) => `3dt_new_order_${orderId}`;
