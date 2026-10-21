/**
 * Order status state machine — the ONE place that says which status changes
 * are allowed, by whom. Safe to import from client components (no database).
 *
 *   AwaitingAcceptance ─accept─▶ Pending ─▶ Printing ─▶ Finished
 *          │ (24 h, or rejected)      ▲  ◀─┘        (admin may reopen ▲)
 *          ▼                          │
 *        Pooled ──────── claim ───────┘
 *   (customer) any open order ─▶ CancellationRequested ─approve─▶ Cancelled
 *                                     └─keep─▶ back to the status it had
 *
 * Money rules on top of the table:
 *   - Printing / Finished need a confirmed payment (cash on delivery excepted).
 *   - A paid order is never "Cancelled" by a status change: it is cancelled by
 *     refunding it (payments/verify mark_refunded, or the ShamCash refund).
 *     An order whose payment is under review must be reviewed first.
 *
 * Routes apply a transition as a conditional update
 * (`updateMany({ where: { id, status: { in: from } } })`) and treat
 * "0 rows changed" as a conflict, so two people can't race an order into
 * contradictory states.
 */

export const ORDER_STATUSES = [
  'AwaitingAcceptance',
  'Pending',
  'Pooled',
  'Printing',
  'Finished',
  'CancellationRequested',
  'Cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Who is changing the order: an admin, a store owner assigned to it, or the customer. */
export type OrderActor = 'admin' | 'owner' | 'customer';

/** Direct status changes (PATCH { status }) — from → allowed targets. */
const STATUS_CHANGES: Record<Exclude<OrderActor, 'customer'>, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  owner: {
    // A new order is accepted (Pending) or rejected (released to the pool), not cancelled.
    AwaitingAcceptance: ['Pending'],
    Pending: ['Printing', 'Finished', 'Cancelled'],
    Printing: ['Pending', 'Finished', 'Cancelled'],
    CancellationRequested: ['Cancelled'],
  },
  admin: {
    AwaitingAcceptance: ['Pending', 'Cancelled'],
    Pending: ['Printing', 'Finished', 'Cancelled'],
    Printing: ['Pending', 'Finished', 'Cancelled'],
    Finished: ['Printing'],
    Pooled: ['Cancelled'],
    CancellationRequested: ['Cancelled'],
  },
};

/** Customer "please cancel": allowed while the order is still open. */
export const CANCELLATION_REQUEST_FROM: OrderStatus[] = ['AwaitingAcceptance', 'Pending', 'Pooled', 'Printing'];
/** "Keep order" (admin / assigned owner) restores the status before the request. */
export const KEEP_ORDER_FROM: OrderStatus[] = ['CancellationRequested'];
/** Release to the shared pool (admin / assigned owner; "Reject" on a new order). */
export const RELEASE_TO_POOL_FROM: OrderStatus[] = ['AwaitingAcceptance', 'Pending', 'Printing'];
/** A store owner claims a pooled order for themselves. */
export const OWNER_CLAIM_FROM: OrderStatus[] = ['Pooled'];
/**
 * An admin assigns an owner. From Pooled / AwaitingAcceptance the order becomes
 * Pending; on Pending / Printing the owner is added and the status kept.
 * Finished, cancelled and cancellation-requested orders are never reset.
 */
export const ADMIN_ASSIGN_FROM: OrderStatus[] = ['Pooled', 'AwaitingAcceptance', 'Pending', 'Printing'];
export const ADMIN_ASSIGN_RESETS_TO_PENDING: OrderStatus[] = ['Pooled', 'AwaitingAcceptance'];
/** Statuses that still let the customer's cancellation be restored to (anything else falls back). */
export const RESTORABLE_STATUSES: OrderStatus[] = CANCELLATION_REQUEST_FROM;

/** Work must not start before the money is in (cash on delivery excepted). */
export const NEEDS_PAYMENT_FIRST: OrderStatus[] = ['Printing', 'Finished'];
/** Payment states in which a status change may NOT cancel the order. */
export const CANCEL_BLOCKED_PAYMENT: string[] = ['paid', 'verifying'];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

/** Targets reachable from `from` by a direct status change, ignoring payment rules. */
export function statusTargets(actor: OrderActor, from: string): OrderStatus[] {
  if (actor === 'customer' || !isOrderStatus(from)) return [];
  return STATUS_CHANGES[actor][from] || [];
}

/** All statuses from which `actor` may move an order to `to` (the `where.status.in` of the update). */
export function statusSources(actor: OrderActor, to: OrderStatus): OrderStatus[] {
  if (actor === 'customer') return [];
  return ORDER_STATUSES.filter((from) => (STATUS_CHANGES[actor][from] || []).includes(to));
}

type PaymentView = { paymentMethod?: string | null; paymentStatus?: string | null };

/**
 * Why `to` is not allowed for this order's payment state, or null if it is.
 * (English, for API errors; the admin page shows its own translated hint.)
 */
export function paymentBlocksStatus(order: PaymentView, to: OrderStatus): string | null {
  const method = order.paymentMethod || 'cod';
  const payment = order.paymentStatus || 'pending';
  if (NEEDS_PAYMENT_FIRST.includes(to) && method !== 'cod' && payment !== 'paid') {
    return 'Payment has not been confirmed for this order yet. Confirm the payment first.';
  }
  if (to === 'Cancelled' && payment === 'paid') {
    return 'This order is paid. Refund the payment to cancel it (Mark refunded, or Refund via ShamCash).';
  }
  if (to === 'Cancelled' && payment === 'verifying') {
    return 'A payment for this order is under review. Confirm or reject the payment before cancelling.';
  }
  return null;
}

/** Status changes the UI should offer for this order (table + payment rules). */
export function allowedStatusChanges(actor: OrderActor, order: PaymentView & { status: string }): OrderStatus[] {
  return statusTargets(actor, order.status).filter((to) => !paymentBlocksStatus(order, to));
}
