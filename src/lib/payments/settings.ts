import { prisma } from '@/lib/db';
import type { PaymentMethodId } from '@/lib/payments/common';
import { isShamCashApiConfigured } from '@/lib/payments/shamcash';

/**
 * Server-side view of the payment settings stored in SiteSetting ("payment.*").
 *
 * A method only counts as AVAILABLE when the admin enabled it AND it has the
 * details a customer needs to actually pay (wallet number, bank account, Stripe
 * keys). This is enforced when an order is created, so a customer can never
 * be sent to pay into a blank number.
 */
export type ServerPaymentSettings = {
  raw: Record<string, string>;
  currency: string;
  available: Record<PaymentMethodId, boolean>;
  shamCashAutoVerify: boolean;
};

export async function getPaymentSettings(): Promise<ServerPaymentSettings> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: 'payment.' } } });
  const raw: Record<string, string> = {};
  rows.forEach((r) => (raw[r.key] = r.value));

  const on = (k: string) => raw[`payment.${k}`] === 'true';
  const has = (k: string) => (raw[`payment.${k}`] || '').trim().length > 0;
  const currency = (raw['payment.currencyLabel'] || 'SYP').trim().toUpperCase();

  return {
    raw,
    currency,
    available: {
      cod: on('codEnabled'),
      bank_transfer: on('bankEnabled') && (has('bankAccountNumber') || has('bankIban')),
      sham_cash: on('shamCashEnabled') && has('shamCashNumber'),
      syriatel_cash: on('syriatelCashEnabled') && has('syriatelCashNumber'),
      stripe: on('stripeEnabled') && !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
    },
    shamCashAutoVerify: isShamCashApiConfigured(),
  };
}
