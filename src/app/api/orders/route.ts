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
    predictedFinishDate: order.predictedFinishAt || undefined,
    isPrioritized: order.isPrioritized || false,
    assignedAdminIds: order.assignments?.map((a: any) => a.ownerId) || [],
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const baseInclude = { items: true, assignments: { include: { owner: true } } };

  // Auto-pool orders older than 24h that are still pending and assigned.
  // Restrict to admin view to avoid side-effects on every store-owner request.
  if (user.role === 'admin') {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stale = await prisma.order.findMany({
      where: { status: 'Pending', updatedAt: { lt: cutoff }, assignments: { some: {} } },
      select: { id: true },
    });
    if (stale.length) {
      const staleIds = stale.map((o) => o.id);
      await prisma.$transaction([
        prisma.orderAssignment.deleteMany({ where: { orderId: { in: staleIds } } }),
        prisma.order.updateMany({ where: { id: { in: staleIds } }, data: { status: 'Pooled' } }),
      ]);
    }
  }

  let orders;
  if (user.role === 'admin') {
    orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: baseInclude,
    });
  } else if (user.role === 'store-owner') {
    orders = await prisma.order.findMany({
      where: {
        OR: [
          { assignments: { some: { ownerId: user.id } } },
          { assignments: { some: { ownerEmail: user.email || '' } } },
          { status: 'Pooled' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: baseInclude,
    });
  } else {
    orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: baseInclude,
    });
  }

  return NextResponse.json({ orders: orders.map(mapOrder) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const body = await req.json();
  const { items, totalAmount, shippingAddress, phoneNumber, customerEmail, assignedAdminIds, isPrioritized } = body;

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
  const productOwners = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, uploaderId: true },
      })
    : [];
  const uploaderIds = Array.from(new Set(productOwners.map((p) => p.uploaderId).filter(Boolean)));
  const initialAssignees = Array.isArray(assignedAdminIds) && assignedAdminIds.length > 0 ? assignedAdminIds : uploaderIds;

  if (!initialAssignees.length) {
    return NextResponse.json({ error: 'Order cannot be created because products are missing uploader assignments.' }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      userId: user?.id,
      status: 'Pending',
      totalAmount: total,
      shippingName: shippingAddress.fullName,
      shippingAddress1: shippingAddress.addressLine1,
      shippingCity: shippingAddress.city,
      shippingPostalCode: shippingAddress.postalCode,
      shippingCountry: shippingAddress.country,
      phoneNumber,
      customerEmail: customerEmail || user?.email,
      isPrioritized: !!isPrioritized,
      items: {
        create: items.map((item: any) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.imageUrl,
        })),
      },
      assignments: assignedAdminIds && assignedAdminIds.length > 0
        ? {
            create: initialAssignees.map((ownerId: string) => ({
              ownerId,
            })),
          }
        : initialAssignees.length
        ? {
            create: initialAssignees.map((ownerId: string) => ({
              ownerId,
            })),
          }
        : undefined,
    },
    include: { items: true, assignments: true },
  });

  return NextResponse.json({ order: mapOrder(order) });
}
