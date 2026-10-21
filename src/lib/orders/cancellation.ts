import 'server-only';
import type { Prisma } from '@prisma/client';
import { RESTORABLE_STATUSES, isOrderStatus, type OrderStatus } from '@/lib/orders/transitions';

/**
 * Remembers the status an order had when the customer asked to cancel it, so
 * "Keep order" can put it back exactly (instead of forcing Pending).
 *
 * Stored as a SiteSetting row ("order.statusBeforeCancellation.<orderId>") so
 * no schema change is needed; the row is written and removed in the same
 * transaction as the status change. Admin settings only read "site." /
 * "payment." prefixes, so these rows never show up there.
 */
const key = (orderId: string) => `order.statusBeforeCancellation.${orderId}`;

export async function rememberStatusBeforeCancellation(tx: Prisma.TransactionClient, orderId: string, status: string) {
  await tx.siteSetting.upsert({
    where: { key: key(orderId) },
    update: { value: status },
    create: { key: key(orderId), value: status },
  });
}

/** Read and delete the remembered status (null for requests made before this existed). */
export async function takeStatusBeforeCancellation(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<OrderStatus | null> {
  const row = await tx.siteSetting.findUnique({ where: { key: key(orderId) } });
  if (!row) return null;
  await tx.siteSetting.deleteMany({ where: { key: key(orderId) } });
  return isOrderStatus(row.value) && RESTORABLE_STATUSES.includes(row.value) ? row.value : null;
}

export async function forgetStatusBeforeCancellation(tx: Prisma.TransactionClient, orderId: string) {
  await tx.siteSetting.deleteMany({ where: { key: key(orderId) } });
}
