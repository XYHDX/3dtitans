'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/payments/common';

/**
 * The store currency (admin → Settings → Payments → currency label), shared by
 * every price on the site so the catalog, cart, checkout and payment
 * instructions always show the same currency.
 *
 * One request per page load, shared by all components that use the hook.
 */
let cached: string | null = null;
let inflight: Promise<string> | null = null;

function loadCurrency(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch('/api/payments/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        cached = String(d?.settings?.['payment.currencyLabel'] || 'SYP').toUpperCase();
        return cached;
      })
      .catch(() => {
        inflight = null;
        return 'SYP';
      });
  }
  return inflight;
}

export function useCurrency() {
  const [currency, setCurrency] = useState<string>(cached || '');
  useEffect(() => {
    let alive = true;
    loadCurrency().then((c) => alive && setCurrency(c));
    return () => {
      alive = false;
    };
  }, []);
  return {
    currency,
    format: (amount: number) => formatMoney(amount, currency),
  };
}
