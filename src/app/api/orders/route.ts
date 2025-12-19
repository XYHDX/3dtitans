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
      return prisma.order.findMany({
        where: { userId: user.id },
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
    const { items, totalAmount, shippingAddress, phoneNumber, customerEmail, assignedAdminIds, isPrioritized, notes } = body;

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

    const productIds = items.map((item: any) => item.productId).filter(Boolean);
    let uploaderIds: string[] = [];
    try {
      uploaderIds = productIds.length
        ? Array.from(
            new Set(
              (
                await prisma.product.findMany({
                  where: { id: { in: productIds } },
                  select: { id: true, uploaderId: true },
                })
              )
                .map((p) => p.uploaderId)
                .filter(Boolean)
            )
          )
        : [];
    } catch (lookupError) {
      console.error('Order assignee lookup failed', lookupError);
    }

    const preferredAssignees = Array.isArray(assignedAdminIds) ? assignedAdminIds : [];
    const initialAssignees = preferredAssignees.length > 0 ? preferredAssignees : uploaderIds;
    const assignees = Array.from(
      new Set((initialAssignees || []).filter((id) => typeof id === 'string' && id.trim().length > 0))
    );

    if (!assignees.length) {
      return NextResponse.json({ error: 'Order cannot be created because products are missing uploader assignments.' }, { status: 400 });
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

    const orderData = {
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
