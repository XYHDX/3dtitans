/**
 * Payment helpers that are safe to import from BOTH client and server code
 * (no secrets, no Node-only modules).
 */

export const PAYMENT_METHODS = ['cod', 'bank_transfer', 'sham_cash', 'sham_cash_epay', 'syriatel_cash', 'stripe'] as const;
export type PaymentMethodId = (typeof PAYMENT_METHODS)[number];

/** Payment statuses an order moves through. */
export type PaymentStatus = 'pending' | 'verifying' | 'paid' | 'failed' | 'refunded';

/**
 * Methods where the customer sends money themselves and an admin confirms it.
 * ('sham_cash_epay' is NOT one: ShamCash confirms those bills itself through
 * the e-pay webhook.)
 */
export const MANUAL_PAYMENT_METHODS: PaymentMethodId[] = ['bank_transfer', 'sham_cash', 'syriatel_cash'];

/**
 * Short, human-friendly order reference, e.g. "3DT-AB12CD34". Customers put
 * this in the transfer note so an admin can match manual payments to orders.
 * ShamCash e-pay bill numbers are built from it too ("3DT-AB12CD34-1").
 */
export function orderReference(orderId: string): string {
  return `3DT-${orderId.slice(-8).toUpperCase()}`;
}

/** Format an amount in the store currency, e.g. "SYP 1,250.00". */
export function formatMoney(amount: number, currency: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  // Syrian pounds have no subunit in practice: show whole numbers.
  const digits = (currency || '').trim().toUpperCase() === 'SYP' ? 0 : 2;
  return `${currency || ''} ${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`.trim();
}
