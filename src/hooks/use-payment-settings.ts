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

const DEFAULTS: PaymentSettings = {
  codEnabled: true,
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

let cached: PaymentSettings | null = null;

export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>(cached || DEFAULTS);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/payments/settings');
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
        cached = parsed;
        if (!cancelled) setSettings(parsed);
      } catch {
        // Keep defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { settings, loading };
}
