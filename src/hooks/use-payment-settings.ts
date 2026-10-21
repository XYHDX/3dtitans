'use client';

import { useCallback, useEffect, useState } from 'react';

export type PaymentMethod = 'cod' | 'bank_transfer' | 'sham_cash' | 'sham_cash_epay' | 'syriatel_cash' | 'stripe';

export type PaymentSettings = {
  codEnabled: boolean;
  bankEnabled: boolean;
  shamCashEnabled: boolean;
  /** ShamCash online payment (e-pay): customer confirms the bill in the ShamCash app / website. */
  shamCashEpayEnabled: boolean;
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
 * Defaults: nothing enabled (safe). If the fetch fails the picker shows a
 * customer-friendly "temporarily unavailable" state with a retry button rather
 * than silently allowing checkout with an unknown method.
 * currencyLabel stays '' until loaded (callers fall back to the order's currency).
 */
const DEFAULTS: PaymentSettings = {
  codEnabled: false,
  bankEnabled: false,
  shamCashEnabled: false,
  shamCashEpayEnabled: false,
  syriatelCashEnabled: false,
  stripeEnabled: false,
  bankName: '',
  bankAccountNumber: '',
  bankIban: '',
  bankAccountHolder: '',
  shamCashNumber: '',
  syriatelCashNumber: '',
  currencyLabel: '',
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
  /** True when the settings could not be loaded (network / server error). */
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // Cache-busting query param so any layer of intermediate caching is bypassed
        const res = await fetch(`/api/payments/settings?_=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const raw: Record<string, string> = data?.settings || {};
        const parsed: PaymentSettings = {
          codEnabled:          raw['payment.codEnabled']          === 'true',
          bankEnabled:         raw['payment.bankEnabled']         === 'true',
          shamCashEnabled:     raw['payment.shamCashEnabled']     === 'true',
          shamCashEpayEnabled: raw['payment.shamCashEpayEnabled'] === 'true',
          syriatelCashEnabled: raw['payment.syriatelCashEnabled'] === 'true',
          stripeEnabled:       raw['payment.stripeEnabled']       === 'true',
          bankName:            raw['payment.bankName']            || '',
          bankAccountNumber:   raw['payment.bankAccountNumber']   || '',
          bankIban:            raw['payment.bankIban']            || '',
          bankAccountHolder:   raw['payment.bankAccountHolder']   || '',
          shamCashNumber:      raw['payment.shamCashNumber']      || '',
          syriatelCashNumber:  raw['payment.syriatelCashNumber']  || '',
          currencyLabel:       (raw['payment.currencyLabel']      || '').toUpperCase(),
        };
        if (!cancelled) {
          setSettings(parsed);
          setError(false);
        }
      } catch (err) {
        console.error('Failed to load payment settings:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  /** Fetch the settings again (e.g. "Try again" after a failure). */
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { settings, loading, error, reload };
}
