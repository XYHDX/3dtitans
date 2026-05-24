'use client';

import { useEffect, useState } from 'react';

export type PaymentMethod = 'cod' | 'bank_transfer' | 'sham_cash' | 'syriatel_cash' | 'stripe';

export type PaymentSettings = {
  codEnabled: boolean;
  bankEnabled: boolean;
  shamCashEnabled: boolean;
  syriatelCashEnabled: boolean;
  stripeEnabled: boolean;

  bankName: string;
  bankAccountNumber: string;
  bankIban: string;
  bankAccountHolder: string;
  shamCashNumber: string;
  syriatelCashNumber: string;

  currencyLabel: string;
};

/**
 * Defaults: nothing enabled (safe). The picker will show "no methods" if the
 * fetch fails — pushes the user to surface the admin settings issue rather
 * than silently allowing checkout with an unknown method.
 */
const DEFAULTS: PaymentSettings = {
  codEnabled: false,
  bankEnabled: false,
  shamCashEnabled: false,
  syriatelCashEnabled: false,
  stripeEnabled: false,
  bankName: '',
  bankAccountNumber: '',
  bankIban: '',
  bankAccountHolder: '',
  shamCashNumber: '',
  syriatelCashNumber: '',
  currencyLabel: 'USD',
};

/**
 * Always fetches fresh on mount. No module-level cache — we used to cache
 * across navigations, but that meant toggling a method in admin didn't
 * affect the checkout page until a hard refresh. The /api/payments/settings
 * endpoint is a single Postgres query and returns in ~30ms, so always-fresh
 * is fine.
 */
export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Cache-busting query param so any layer of intermediate caching is bypassed
        const res = await fetch(`/api/payments/settings?_=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        const raw: Record<string, string> = data?.settings || {};
        const parsed: PaymentSettings = {
          codEnabled:          raw['payment.codEnabled']          === 'true',
          bankEnabled:         raw['payment.bankEnabled']         === 'true',
          shamCashEnabled:     raw['payment.shamCashEnabled']     === 'true',
          syriatelCashEnabled: raw['payment.syriatelCashEnabled'] === 'true',
          stripeEnabled:       raw['payment.stripeEnabled']       === 'true',
          bankName:            raw['payment.bankName']            || '',
          bankAccountNumber:   raw['payment.bankAccountNumber']   || '',
          bankIban:            raw['payment.bankIban']            || '',
          bankAccountHolder:   raw['payment.bankAccountHolder']   || '',
          shamCashNumber:      raw['payment.shamCashNumber']      || '',
          syriatelCashNumber:  raw['payment.syriatelCashNumber']  || '',
          currencyLabel:       raw['payment.currencyLabel']       || 'USD',
        };
        if (!cancelled) setSettings(parsed);
      } catch (err) {
        console.error('Failed to load payment settings:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { settings, loading };
}
