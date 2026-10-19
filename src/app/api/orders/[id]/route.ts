import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { mapOrder } from '@/lib/orders/map';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PRIORITY_MULTIPLIER = 1.2;
const OWNER_STATUSES = ['Pending', 'Printing', 'Finished', 'Cancelled'];
const ADMIN_STATUSES = ['AwaitingAcceptance', 'Pending', 'Printing', 'Finished', 'Pooled', 'CancellationRequested', 'Cancelled'];
/** Work must not start before the money is in (cash-on-delivery excepted). */
const NEEDS_PAYMENT_FIRST = ['Printing', 'Finished'];

type Viewer = { id: string; email?: string | null; role?: string };

function isCustomerOf(order: { userId: string | null; customerEmail: string | null }, user: Viewer) {
  if (order.userId) return order.userId === user.id;
  // Legacy orders created before orders were linked to accounts.
  return !!order.customerEmail && !!user.email && order.customerEmail.toLowerCase() === user.email.toLowerCase();
}

function isAssignedOwner(order: { assignments: { ownerId: string }[] }, user: Viewer) {
  return user.role === 'store-owner' && order.assignments.some((a) => a.ownerId === user.id);
}

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
    if (isCustomerOf(order, user)) return NextResponse.json({ order: mapOrder(order, 'customer') });
    if (isAssignedOwner(order, user)) return NextResponse.json({ order: mapOrder(order, 'owner') });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (err) {
    console.error('orders GET [id]', err);
    return NextResponse.json({ error: 'Failed to load order' }, { status: 500 });
  }
}

/**
 * PATCH /api/orders/[id]
 *
 * Who may do what:
 *  - customer:        { requestCancellation: true } only
 *  - pooled order:    any store owner may { claimForOwnerId: <their own id> } only
 *  - assigned owner:  status (Pending/Printing/Finished/Cancelled), predictedFinishDate, releaseToPool
 *  - admin:           all of the above + isPrioritized + claim for anyone
 * The total is NEVER taken from the client; prioritizing recomputes it server-side.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { status, predictedFinishDate, isPrioritized, releaseToPool, claimForOwnerId, requestCancellation } = body || {};

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { assignments: true, items: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const isOwner = isAssignedOwner(existing, user);
    const respond = async () => {
      const updated = await prisma.order.findUnique({ where: { id }, include: { assignments: true, items: true } });
      return NextResponse.json({ order: mapOrder(updated, isAdmin ? 'admin' : isOwner ? 'owner' : 'customer') });
    };

    // ---- Customer cancellation request -------------------------------------
    if (requestCancellation) {
      if (!isCustomerOf(existing, user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (['Finished', 'Cancelled', 'CancellationRequested'].includes(existing.status)) {
        return NextResponse.json({ error: 'Order can no longer be cancelled' }, { status: 400 });
      }
      await prisma.order.update({ where: { id }, data: { status: 'CancellationRequested' } });
      return respond();
    }

    // ---- Claiming an order ---------------------------------------------------
    if (claimForOwnerId) {
      const claimingSelf = user.role === 'store-owner' && claimForOwnerId === user.id && existing.status === 'Pooled';
      if (!isAdmin && !claimingSelf) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const owner = await prisma.user.findUnique({ where: { id: String(claimForOwnerId) }, select: { id: true, email: true, role: true } });
      if (!owner || (owner.role !== 'store-owner' && owner.role !== 'admin')) {
        return NextResponse.json({ error: 'Invalid store owner' }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.orderAssignment.upsert({
          where: { orderId_ownerId: { orderId: id, ownerId: owner.id } },
          update: { ownerEmail: owner.email || null, releasedAt: null },
          create: { orderId: id, ownerId: owner.id, ownerEmail: owner.email || null },
        }),
        prisma.order.update({ where: { id }, data: { status: 'Pending' } }),
      ]);
      return respond();
    }

    // ---- Everything else: admin or assigned owner only -----------------------
    if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (releaseToPool) {
      if (existing.status === 'Finished' || existing.status === 'Cancelled') {
        return NextResponse.json({ error: 'Finished or cancelled orders cannot be pooled' }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.orderAssignment.deleteMany({ where: { orderId: id } }),
        prisma.order.update({ where: { id }, data: { status: 'Pooled' } }),
      ]);
      return respond();
    }

    const data: Record<string, any> = {};

    if (status !== undefined) {
      const allowed = isAdmin ? ADMIN_STATUSES : OWNER_STATUSES;
      if (typeof status !== 'string' || !allowed.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      const method = existing.paymentMethod || 'cod';
      if (NEEDS_PAYMENT_FIRST.includes(status) && method !== 'cod' && existing.paymentStatus !== 'paid') {
        return NextResponse.json(
          { error: 'Payment has not been confirmed for this order yet. Confirm the payment first.' },
          { status: 400 }
        );
      }
      if (status === 'Cancelled' && !isAdmin && existing.paymentStatus === 'paid') {
        return NextResponse.json({ error: 'This order is paid — only an admin can cancel (and refund) it.' }, { status: 403 });
      }
      data.status = status;
    }

    if (predictedFinishDate !== undefined && predictedFinishDate !== null) {
      const d = new Date(predictedFinishDate);
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      data.predictedFinishAt = d;
    }

    if (typeof isPrioritized === 'boolean' && isPrioritized !== existing.isPrioritized) {
      if (!isAdmin) return NextResponse.json({ error: 'Only an admin can change priority' }, { status: 403 });
      if (!['pending', 'failed'].includes(existing.paymentStatus)) {
        return NextResponse.json(
          { error: 'Priority changes the price, so it can only be changed before the customer pays.' },
          { status: 400 }
        );
      }
      const base = existing.items.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0);
      data.isPrioritized = isPrioritized;
      data.totalAmount = Math.round(base * (isPrioritized ? PRIORITY_MULTIPLIER : 1) * 100) / 100;
    }

    if (!Object.keys(data).length) return respond();
    await prisma.order.update({ where: { id }, data });
    return respond();
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

    const existing = await prisma.order.findUnique({ where: { id }, select: { id: true, paymentStatus: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Paid orders are accounting records (and hold the transfer that paid them,
    // which must stay "used"). Cancel them instead of deleting.
    if (existing.paymentStatus === 'paid' || existing.paymentStatus === 'verifying') {
      return NextResponse.json({ error: 'Paid orders cannot be deleted. Cancel the order instead.' }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.paymentTransaction.deleteMany({ where: { orderId: id } }),
      prisma.orderAssignment.deleteMany({ where: { orderId: id } }),
      prisma.orderItem.deleteMany({ where: { orderId: id } }),
      prisma.order.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('orders DELETE [id]', err);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
