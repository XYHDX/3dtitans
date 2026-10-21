import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { mapOrder, type OrderViewer } from '@/lib/orders/map';
import { isOrderCustomer } from '@/lib/orders/access';
import {
  ADMIN_ASSIGN_FROM,
  ADMIN_ASSIGN_RESETS_TO_PENDING,
  CANCELLATION_REQUEST_FROM,
  CANCEL_BLOCKED_PAYMENT,
  KEEP_ORDER_FROM,
  NEEDS_PAYMENT_FIRST,
  OWNER_CLAIM_FROM,
  RELEASE_TO_POOL_FROM,
  isOrderStatus,
  paymentBlocksStatus,
  statusTargets,
  type OrderStatus,
} from '@/lib/orders/transitions';
import {
  forgetStatusBeforeCancellation,
  rememberStatusBeforeCancellation,
  takeStatusBeforeCancellation,
} from '@/lib/orders/cancellation';
import { getPaymentSettings } from '@/lib/payments/settings';
import { notifyOrderTotalChanged } from '@/lib/email';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PRIORITY_MULTIPLIER = 1.2;

type Viewer = { id: string; email?: string | null; role?: string };

function isAssignedOwner(order: { assignments: { ownerId: string }[] }, user: Viewer) {
  return user.role === 'store-owner' && order.assignments.some((a) => a.ownerId === user.id);
}

/** Someone else changed the order between our read and our conditional write. */
class Conflict extends Error {}

const conflictResponse = () =>
  NextResponse.json(
    { error: 'This order was changed by someone else in the meantime. Refresh and try again.', code: 'conflict' },
    { status: 409 }
  );

/** GET /api/orders/[id] — one order. Visible to the customer, assigned owners and admins. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, assignments: true },
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.role === 'admin') return NextResponse.json({ order: mapOrder(order, 'admin') });
    if (isAssignedOwner(order, user)) return NextResponse.json({ order: mapOrder(order, 'owner') });
    if (await isOrderCustomer(order, user.id)) return NextResponse.json({ order: mapOrder(order, 'customer') });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (err) {
    console.error('orders GET [id]', err);
    return NextResponse.json({ error: 'Failed to load order' }, { status: 500 });
  }
}

/**
 * PATCH /api/orders/[id]
 *
 * Who may do what (status rules live in src/lib/orders/transitions.ts):
 *  - customer:        { requestCancellation: true } only
 *  - pooled order:    any store owner may { claimForOwnerId: <their own id> } only
 *  - assigned owner:  status, predictedFinishDate, releaseToPool, keepOrder
 *  - admin:           all of the above + isPrioritized + assign any owner
 * Every status change is a conditional update; losing a race returns 409.
 * The total is NEVER taken from the client; prioritizing recomputes it server-side.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { status, predictedFinishDate, isPrioritized, releaseToPool, claimForOwnerId, requestCancellation, keepOrder } =
      body || {};

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { assignments: true, items: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const isOwner = isAssignedOwner(existing, user);
    const respond = async (viewer: OrderViewer) => {
      const updated = await prisma.order.findUnique({ where: { id }, include: { assignments: true, items: true } });
      return NextResponse.json({ order: mapOrder(updated, viewer) });
    };
    const staffViewer: OrderViewer = isAdmin ? 'admin' : 'owner';

    // ---- Customer cancellation request -------------------------------------
    if (requestCancellation) {
      if (!(await isOrderCustomer(existing, user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (!CANCELLATION_REQUEST_FROM.includes(existing.status as OrderStatus)) {
        return NextResponse.json({ error: 'Order can no longer be cancelled' }, { status: 400 });
      }
      const ok = await prisma.$transaction(async (tx) => {
        const res = await tx.order.updateMany({
          where: { id, status: existing.status },
          data: { status: 'CancellationRequested' },
        });
        if (res.count !== 1) return false;
        // So "Keep order" can restore exactly this status.
        await rememberStatusBeforeCancellation(tx, id, existing.status);
        return true;
      });
      if (!ok) return conflictResponse();
      return respond(isAdmin ? 'admin' : 'customer');
    }

    // ---- Claiming / assigning an order ---------------------------------------
    if (claimForOwnerId) {
      const targetId = String(claimForOwnerId);
      const claimingSelf = user.role === 'store-owner' && targetId === user.id;
      if (!isAdmin && !claimingSelf) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const allowedFrom = isAdmin ? ADMIN_ASSIGN_FROM : OWNER_CLAIM_FROM;
      if (!allowedFrom.includes(existing.status as OrderStatus)) {
        return NextResponse.json(
          {
            error: isAdmin
              ? 'Finished, cancelled or cancellation-requested orders cannot be reassigned.'
              : 'This order is no longer in the pool.',
            code: 'not_claimable',
          },
          { status: 409 }
        );
      }
      const owner = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, email: true, role: true } });
      if (!owner || (owner.role !== 'store-owner' && owner.role !== 'admin')) {
        return NextResponse.json({ error: 'Invalid store owner' }, { status: 400 });
      }
      const resetToPending = !isAdmin || ADMIN_ASSIGN_RESETS_TO_PENDING.includes(existing.status as OrderStatus);
      const ok = await prisma.$transaction(async (tx) => {
        // The conditional write is the lock: of two simultaneous claims on a
        // pooled order, exactly one sees the status still unchanged.
        const res = await tx.order.updateMany({
          where: { id, status: existing.status },
          data: resetToPending ? { status: 'Pending' } : { updatedAt: new Date() },
        });
        if (res.count !== 1) return false;
        await tx.orderAssignment.upsert({
          where: { orderId_ownerId: { orderId: id, ownerId: owner.id } },
          update: { ownerEmail: owner.email || null, releasedAt: null },
          create: { orderId: id, ownerId: owner.id, ownerEmail: owner.email || null },
        });
        return true;
      });
      if (!ok) {
        return NextResponse.json(
          { error: 'Someone else claimed or changed this order first. Refresh the list.', code: 'conflict' },
          { status: 409 }
        );
      }
      return respond(isAdmin ? 'admin' : 'owner');
    }

    // ---- Everything else: admin or assigned owner only -----------------------
    if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (releaseToPool) {
      if (!RELEASE_TO_POOL_FROM.includes(existing.status as OrderStatus)) {
        return NextResponse.json(
          { error: 'Only new, pending or printing orders can be released to the pool.', code: 'invalid_transition' },
          { status: 400 }
        );
      }
      const ok = await prisma.$transaction(async (tx) => {
        const res = await tx.order.updateMany({ where: { id, status: existing.status }, data: { status: 'Pooled' } });
        if (res.count !== 1) return false;
        await tx.orderAssignment.deleteMany({ where: { orderId: id } });
        return true;
      });
      if (!ok) return conflictResponse();
      return respond(isAdmin ? 'admin' : 'pool');
    }

    // "Keep order": decline the customer's cancellation request and put the
    // order back where it was (not blindly to Pending).
    if (keepOrder) {
      if (!KEEP_ORDER_FROM.includes(existing.status as OrderStatus)) {
        return NextResponse.json({ error: 'There is no cancellation request on this order.' }, { status: 400 });
      }
      try {
        await prisma.$transaction(async (tx) => {
          const previous =
            (await takeStatusBeforeCancellation(tx, id)) ?? (existing.assignments.length ? 'Pending' : 'Pooled');
          const res = await tx.order.updateMany({
            where: { id, status: 'CancellationRequested' },
            data: { status: previous },
          });
          if (res.count !== 1) throw new Conflict();
        });
      } catch (err) {
        if (err instanceof Conflict) return conflictResponse();
        throw err;
      }
      return respond(staffViewer);
    }

    const data: Prisma.OrderUpdateManyMutationInput = {};
    const conditions: Prisma.OrderWhereInput[] = [{ id }];
    let newStatus: OrderStatus | null = null;
    let priorityChanged = false;

    if (status !== undefined && status !== existing.status) {
      if (!isOrderStatus(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      if (!statusTargets(isAdmin ? 'admin' : 'owner', existing.status).includes(status)) {
        return NextResponse.json(
          { error: `An order can't go from "${existing.status}" to "${status}".`, code: 'invalid_transition' },
          { status: 400 }
        );
      }
      const blocked = paymentBlocksStatus(existing, status);
      if (blocked) return NextResponse.json({ error: blocked, code: 'payment_blocks_status' }, { status: 400 });

      newStatus = status;
      data.status = status;
      conditions.push({ status: existing.status });
      // Re-check the payment rules in the same write (a payment may land meanwhile).
      if (status === 'Cancelled') conditions.push({ paymentStatus: { notIn: CANCEL_BLOCKED_PAYMENT } });
      if (NEEDS_PAYMENT_FIRST.includes(status) && (existing.paymentMethod || 'cod') !== 'cod') {
        conditions.push({ paymentStatus: 'paid' });
      }
    }

    if (predictedFinishDate !== undefined && predictedFinishDate !== null) {
      const d = new Date(predictedFinishDate);
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      data.predictedFinishAt = d;
    }

    if (typeof isPrioritized === 'boolean' && isPrioritized !== existing.isPrioritized) {
      if (!isAdmin) return NextResponse.json({ error: 'Only an admin can change priority' }, { status: 403 });
      if (['Finished', 'Cancelled', 'CancellationRequested'].includes(existing.status)) {
        return NextResponse.json({ error: 'Priority can only be changed on open orders.' }, { status: 400 });
      }
      // The +20% changes the amount due. Once the customer has started paying
      // (reference, screenshot, card checkout, ShamCash bill) the amount they
      // were told must not move under them.
      if (existing.paymentStatus !== 'pending' || existing.paymentReference || existing.paymentProofUrl) {
        return NextResponse.json(
          {
            error:
              'Priority changes the price, so it can only be changed before the customer starts paying (no payment, reference, screenshot or card checkout yet).',
            code: 'payment_started',
          },
          { status: 400 }
        );
      }
      const openBills = await prisma.paymentAttempt.count({ where: { orderId: id, status: 'pending' } });
      if (openBills > 0) {
        return NextResponse.json(
          {
            error: 'The customer has an open ShamCash bill for the current total. Try again after it expires (about 10 minutes).',
            code: 'payment_started',
          },
          { status: 400 }
        );
      }
      const base = existing.items.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0);
      data.isPrioritized = isPrioritized;
      data.totalAmount = Math.round(base * (isPrioritized ? PRIORITY_MULTIPLIER : 1) * 100) / 100;
      conditions.push({
        isPrioritized: existing.isPrioritized,
        paymentStatus: 'pending',
        paymentReference: null,
        paymentProofUrl: null,
      });
      priorityChanged = true;
    }

    if (!Object.keys(data).length) return respond(staffViewer);

    const ok = await prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({ where: { AND: conditions }, data });
      if (res.count !== 1) return false;
      if (newStatus === 'Cancelled') await forgetStatusBeforeCancellation(tx, id);
      return true;
    });
    if (!ok) return conflictResponse();

    if (priorityChanged) {
      // Tell the customer the new amount before they pay.
      try {
        const updated = await prisma.order.findUnique({
          where: { id },
          select: { id: true, totalAmount: true, currency: true, customerEmail: true, shippingName: true, paymentMethod: true },
        });
        if (updated) {
          const { currency } = await getPaymentSettings();
          await notifyOrderTotalChanged(updated, currency, !!isPrioritized);
        }
      } catch (err) {
        console.error('orders PATCH [id]: total-changed email failed', err);
      }
    }
    return respond(staffViewer);
  } catch (err) {
    console.error('orders PATCH [id]', err);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true, paymentStatus: true, _count: { select: { paymentTransactions: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Paid orders are accounting records (and hold the transfer that paid them,
    // which must stay "used"). Cancel them instead of deleting.
    if (existing.paymentStatus === 'paid' || existing.paymentStatus === 'verifying') {
      return NextResponse.json({ error: 'Paid orders cannot be deleted. Cancel the order instead.' }, { status: 409 });
    }
    // Payment records (incl. refunds) are never deleted: they keep a transfer
    // from being reused and are the audit trail.
    if (existing._count.paymentTransactions > 0) {
      return NextResponse.json(
        { error: 'This order has payment records, so it cannot be deleted. Cancel it instead.', code: 'has_payments' },
        { status: 409 }
      );
    }

    // A ShamCash e-pay bill that is still open (or was paid / refunded) must keep
    // its order so a late webhook can still be matched. Expired / failed attempts
    // are just history and go with the order.
    const liveAttempts = await prisma.paymentAttempt.count({
      where: { orderId: id, status: { notIn: ['expired', 'failed'] } },
    });
    if (liveAttempts > 0) {
      return NextResponse.json(
        { error: 'This order has a ShamCash payment in progress or completed. Wait 15 minutes, or cancel the order instead.' },
        { status: 409 }
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.paymentAttempt.deleteMany({ where: { orderId: id, status: { in: ['expired', 'failed'] } } });
        await tx.orderAssignment.deleteMany({ where: { orderId: id } });
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await forgetStatusBeforeCancellation(tx, id);
        // Fails (FK) if a payment was recorded in the meantime — then nothing is deleted.
        await tx.order.delete({ where: { id } });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        return NextResponse.json(
          { error: 'A payment was just recorded for this order, so it cannot be deleted. Cancel it instead.', code: 'has_payments' },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('orders DELETE [id]', err);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
