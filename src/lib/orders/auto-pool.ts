import 'server-only';
import { prisma } from '@/lib/db';

/** New orders nobody accepted within this time go to the shared pool. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const BATCH = 200;

/**
 * Move orders still "AwaitingAcceptance" after 24 h to the pool, dropping their
 * owner assignments so any store owner can claim them. Runs from the
 * scheduled reconcile job (/api/payments/shamcash/reconcile) — never as a side
 * effect of viewing a list. Returns how many orders were pooled.
 */
export async function poolStaleOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const stale = await prisma.order.findMany({
    where: { status: 'AwaitingAcceptance', createdAt: { lt: cutoff }, assignments: { some: {} } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: BATCH,
  });
  if (!stale.length) return 0;
  const ids = stale.map((o) => o.id);

  return prisma.$transaction(async (tx) => {
    // Conditional: an owner who accepted the order a moment ago wins.
    const moved = await tx.order.updateMany({
      where: { id: { in: ids }, status: 'AwaitingAcceptance' },
      data: { status: 'Pooled' },
    });
    await tx.orderAssignment.deleteMany({ where: { orderId: { in: ids }, order: { status: 'Pooled' } } });
    return moved.count;
  });
}
