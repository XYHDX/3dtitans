import { getPaymentSettings } from '@/lib/payments/settings';
import { NextResponse } from 'next/server';

// Force dynamic + no caching so admin toggles take effect immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/payments/settings — public payment configuration.
 *
 * Returns which methods customers can use and the customer-facing details
 * (bank/wallet numbers). A method is reported as enabled only when it is
 * switched on AND fully configured (e.g. Sham Cash needs a wallet number) —
 * the same rule the order API enforces. Secrets live in env vars and are never sent.
 */
export async function GET() {
  try {
    const { raw, available, currency } = await getPaymentSettings();
    const pick = (k: string) => raw[`payment.${k}`] || '';
    const settings: Record<string, string> = {
      'payment.codEnabled': String(available.cod),
      'payment.bankEnabled': String(available.bank_transfer),
      'payment.shamCashEnabled': String(available.sham_cash),
      // Only a boolean — the ShamCash e-pay keys live in server env vars and are never sent.
      'payment.shamCashEpayEnabled': String(available.sham_cash_epay),
      'payment.syriatelCashEnabled': String(available.syriatel_cash),
      'payment.stripeEnabled': String(available.stripe),
      'payment.bankName': pick('bankName'),
      'payment.bankAccountNumber': pick('bankAccountNumber'),
      'payment.bankIban': pick('bankIban'),
      'payment.bankAccountHolder': pick('bankAccountHolder'),
      'payment.shamCashNumber': pick('shamCashNumber'),
      'payment.syriatelCashNumber': pick('syriatelCashNumber'),
      'payment.currencyLabel': currency,
    };
    return NextResponse.json(
      { settings },
      { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }
    );
  } catch (err) {
    console.error('payments/settings GET', err);
    return NextResponse.json({ settings: {}, error: 'Failed to load settings' }, { status: 500 });
  }
}
