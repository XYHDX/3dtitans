import { prisma } from '@/lib/db';
import type { PaymentMethodId } from '@/lib/payments/common';
import { isShamCashEpayConfigured, shamCashCurrencyId } from '@/lib/payments/shamcash-epay';

/**
 * Server-side view of the payment settings stored in SiteSetting ("payment.*").
 *
 * A method only counts as AVAILABLE when the admin enabled it AND it has the
 * details a customer needs to actually pay (wallet number, bank account, Stripe
 * keys, ShamCash e-pay keys) AND it can charge in the store currency. This is
 * enforced when an order is created, so a customer can never be sent to pay
 * into a blank number or to a card checkout that can't take the currency.
 */
export type ServerPaymentSettings = {
  raw: Record<string, string>;
  currency: string;
  available: Record<PaymentMethodId, boolean>;
};

/** Currencies the store may be priced in (the admin setting is validated against this). */
export const SUPPORTED_CURRENCIES = ['USD', 'SYP'] as const;
/** Used only when the setting was never saved. The store sells in US dollars. */
export const DEFAULT_CURRENCY = 'USD';

/**
 * Currencies we charge by card through Stripe. Stripe has no SYP, and an
 * unknown / free-text label is never sent to Stripe.
 */
const STRIPE_CURRENCIES = new Set(['USD']);

export function isStripeCurrency(currency: string | null | undefined): boolean {
  return STRIPE_CURRENCIES.has((currency || '').trim().toUpperCase());
}

export function isSupportedCurrency(currency: string | null | undefined): boolean {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes((currency || '').trim().toUpperCase());
}

/** The currency a stored order is priced in: its own (set at creation), else the store's (legacy rows). */
export function orderCurrency(order: { currency?: string | null }, storeCurrency: string): string {
  return (order.currency || '').trim().toUpperCase() || storeCurrency;
}

export async function getPaymentSettings(): Promise<ServerPaymentSettings> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: 'payment.' } } });
  const raw: Record<string, string> = {};
  rows.forEach((r) => (raw[r.key] = r.value));

  const on = (k: string) => raw[`payment.${k}`] === 'true';
  const has = (k: string) => (raw[`payment.${k}`] || '').trim().length > 0;
  const currency = (raw['payment.currencyLabel'] || DEFAULT_CURRENCY).trim().toUpperCase();

  return {
    raw,
    currency,
    available: {
      cod: on('codEnabled'),
      bank_transfer: on('bankEnabled') && (has('bankAccountNumber') || has('bankIban')),
      sham_cash: on('shamCashEnabled') && has('shamCashNumber'),
      // ShamCash e-pay: server keys valid + admin switched it on + a currency ShamCash bills in (USD / SYP).
      sham_cash_epay: isShamCashEpayConfigured() && on('shamCashEpayEnabled') && shamCashCurrencyId(currency) !== null,
      syriatel_cash: on('syriatelCashEnabled') && has('syriatelCashNumber'),
      stripe:
        on('stripeEnabled') &&
        !!process.env.STRIPE_SECRET_KEY &&
        !!process.env.STRIPE_WEBHOOK_SECRET &&
        isStripeCurrency(currency),
    },
  };
}
