import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

function mapOrder(order: any) {
  return {
    id: order.id,
    userId: order.userId || '',
    orderDate: order.createdAt,
    updatedAt: order.updatedAt,
    totalAmount: Number(order.totalAmount),
    status: order.status as any,
    items: order.items.map((item: any) => ({
      productId: item.productId || '',
      name: item.name,
      quantity: item.quantity,
      price: Number(item.price),
      imageUrl: item.imageUrl || '',
    })),
    productIds: order.items.map((i: any) => i.productId || ''),
    shippingAddress: {
      fullName: order.shippingName,
      addressLine1: order.shippingAddress1,
      city: order.shippingCity,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry,
    },
    phoneNumber: order.phoneNumber,
    customerEmail: order.customerEmail || '',
    notes: (order as any).notes || '',
    predictedFinishDate: order.predictedFinishAt || undefined,
    isPrioritized: order.isPrioritized || false,
    assignedAdminIds: order.assignments?.map((a: any) => a.ownerId) || [],
  };
}

async function ensureOrderNotesColumn() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "notes" TEXT;');
    return true;
  } catch (error) {
    console.error('Failed to ensure Order.notes column', error);
    return false;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const baseSelect = {
      id: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      totalAmount: true,
      status: true,
      shippingName: true,
      shippingAddress1: true,
      shippingCity: true,
      shippingPostalCode: true,
      shippingCountry: true,
      phoneNumber: true,
      customerEmail: true,
      predictedFinishAt: true,
      isPrioritized: true,
      // notes intentionally omitted to tolerate databases missing this column.
      items: { select: { productId: true, name: true, quantity: true, price: true, imageUrl: true } },
      assignments: { select: { ownerId: true, ownerEmail: true, owner: { select: { id: true } } } },
    };

    // Auto-pool orders older than 24h that are still awaiting acceptance and assigned.
    // Restrict to admin view to avoid side-effects on every store-owner request.
    if (user.role === 'admin') {
      try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const stale = await prisma.order.findMany({
          where: { status: 'AwaitingAcceptance', createdAt: { lt: cutoff }, assignments: { some: {} } },
          select: { id: true },
        });
        if (stale.length) {
          const staleIds = stale.map((o) => o.id);
          await prisma.$transaction([
            prisma.orderAssignment.deleteMany({ where: { orderId: { in: staleIds } } }),
            prisma.order.updateMany({ where: { id: { in: staleIds } }, data: { status: 'Pooled' } }),
          ]);
        }
      } catch (error) {
        console.error('Orders auto-pool step failed', error);
        // Do not block the response on this maintenance task.
      }
    }

    let orders;
    const fetchOrders = async () => {
      const userEmail = (user.email || '').toLowerCase();
      if (user.role === 'admin') {
        return prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          select: baseSelect,
        });
      }
      if (user.role === 'store-owner') {
        return prisma.order.findMany({
          where: {
            OR: [
              { assignments: { some: { ownerId: user.id } } },
              { assignments: { some: { ownerEmail: user.email || '' } } },
              { status: 'Pooled' },
            ],
          },
          orderBy: { createdAt: 'desc' },
          select: baseSelect,
        });
      }
      const userFilter = [
        { userId: user.id },
        userEmail ? { customerEmail: userEmail } : undefined,
      ].filter(Boolean) as any[];
      return prisma.order.findMany({
        where: { OR: userFilter },
        orderBy: { createdAt: 'desc' },
        select: baseSelect,
      });
    };

    try {
      orders = await fetchOrders();
    } catch (fetchError) {
      console.error('Orders fetch failed with relations, retrying without includes', fetchError);
      // Fallback without relation includes to avoid breaking the endpoint due to bad data.
      orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        select: baseSelect,
      });
    }

    return NextResponse.json({ orders: orders.map(mapOrder) });
  } catch (error: any) {
    console.error('Orders GET failed', error);
    const message = error?.message || 'Failed to load orders';
    return NextResponse.json({ error: message, code: error?.code }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (user?.role === 'store-owner') return NextResponse.json({ error: 'Store owners cannot place orders' }, { status: 403 });

    const body = await req.json();
    // NOTE: `assignedAdminIds` deliberately not destructured. Assignees are derived
    // server-side from product uploaders — clients have no business naming admins.
    const { items, totalAmount, shippingAddress, phoneNumber, customerEmail, isPrioritized, notes, paymentMethod, idempotencyKey } = body;

    // Idempotency — if this key was already used, return the existing order.
    // Stops duplicate orders from double-clicks, network retries, browser back/forward.
    if (typeof idempotencyKey === 'string' && idempotencyKey.length >= 8) {
      try {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey } as any,
          include: { items: true, assignments: true },
        });
        if (existing) {
          // Only the original placer (or matching email) can claim the duplicate.
          // Different user with the same key (effectively impossible with UUIDs)
          // → treat as conflict, never leak someone else's order.
          const sameUser =
            (!!user?.id && existing.userId === user.id) ||
            (!!user?.email && !!existing.customerEmail &&
              existing.customerEmail.toLowerCase() === user.email.toLowerCase());
          if (sameUser) {
            return NextResponse.json({ order: mapOrder(existing) });
          }
          return NextResponse.json({ error: 'Idempotency key conflict' }, { status: 409 });
        }
      } catch (e) {
        // Pre-migration databases won't have the column yet — fall through and
        // create the order without idempotency protection. Logs the issue so
        // the admin knows the Phase 6 migration is pending.
        console.warn('Idempotency lookup failed (run phase6 migration?):', (e as Error).message);
      }
    }

    // Validate payment method (Phase 4)
    const validMethods = ['cod', 'bank_transfer', 'sham_cash', 'syriatel_cash', 'stripe'];
    if (paymentMethod && !validMethods.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }
    const total = Number(totalAmount);
    if (Number.isNaN(total)) {
      return NextResponse.json({ error: 'Total amount is required' }, { status: 400 });
    }
    if (!shippingAddress?.fullName || !shippingAddress?.addressLine1 || !shippingAddress?.city || !shippingAddress?.postalCode || !shippingAddress?.country) {
      return NextResponse.json({ error: 'Shipping address is incomplete' }, { status: 400 });
    }

    // Server-side derivation of assignees — entirely from the cart's product
    // uploaders. The client doesn't get a say (previously sent `assignedAdminIds`
    // which is a security smell — let users target arbitrary admins).
    const productIds = items.map((item: any) => item.productId).filter(Boolean);
    let assignees: string[] = [];
    try {
      const products = productIds.length
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, uploaderId: true },
          })
        : [];
      assignees = Array.from(
        new Set(
          products
            .map((p) => p.uploaderId)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        )
      );
    } catch (lookupError) {
      console.error('Order assignee lookup failed', lookupError);
    }

    if (!assignees.length) {
      return NextResponse.json(
        { error: 'Order cannot be created because products are missing uploader assignments.' },
        { status: 400 }
      );
    }

    let userId: string | undefined;
    if (user?.id) {
      try {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        userId = dbUser?.id || undefined;
      } catch (userLookupError) {
        console.error('Order user lookup failed', userLookupError);
      }
    }

    const orderData: any = {
      userId,
      status: 'AwaitingAcceptance',
      totalAmount: total,
      shippingName: shippingAddress.fullName,
      shippingAddress1: shippingAddress.addressLine1,
      shippingCity: shippingAddress.city,
      shippingPostalCode: shippingAddress.postalCode,
      shippingCountry: shippingAddress.country,
      phoneNumber,
      customerEmail: customerEmail || user?.email,
      isPrioritized: !!isPrioritized,
      notes: typeof notes === 'string' ? notes : '',
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: 'pending',
      // Idempotency — uniqueness enforced at DB level. If two simultaneous
      // POSTs race in with the same key, the second create throws P2002 and
      // we catch + return the winning order below.
      ...(typeof idempotencyKey === 'string' && idempotencyKey.length >= 8
        ? { idempotencyKey }
        : {}),
      items: {
        create: items.map((item: any) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.imageUrl,
        })),
      },
      assignments: assignees.length
        ? {
            create: assignees.map((ownerId: string) => ({
              ownerId,
            })),
          }
        : undefined,
    };

    let order;
    try {
      order = await prisma.order.create({
        data: orderData,
        include: { items: true, assignments: true },
      });
    } catch (error: any) {
      // Idempotency race: two simultaneous POSTs with the same key. The DB's
      // unique constraint rejects the loser with P2002. Fetch the winning
      // order (which arrived a microsecond earlier) and return it.
      if (error?.code === 'P2002' && orderData.idempotencyKey) {
        const winner = await prisma.order.findUnique({
          where: { idempotencyKey: orderData.idempotencyKey } as any,
          include: { items: true, assignments: true },
        });
        if (winner) return NextResponse.json({ order: mapOrder(winner) });
        throw error;
      }
      if (error?.code === 'P2022') {
        const ensured = await ensureOrderNotesColumn();
        if (ensured) {
          order = await prisma.order.create({
            data: orderData,
            include: { items: true, assignments: true },
          });
        } else {
          throw error;
        }
      } else if (error?.code === 'P2003' && orderData.userId) {
        console.warn('Order create failed with user FK, retrying without userId');
        order = await prisma.order.create({
          data: { ...orderData, userId: undefined },
          include: { items: true, assignments: true },
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json({ order: mapOrder(order) });
  } catch (error: any) {
    console.error('Orders POST failed', error);
    const message = error?.message || 'Failed to create order';
    return NextResponse.json({ error: message, code: error?.code }, { status: 500 });
  }
}
