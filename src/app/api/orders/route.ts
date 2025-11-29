import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

function mapOrder(order: any) {
  return {
    id: order.id,
    userId: order.userId || '',
    orderDate: order.createdAt,
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

  const baseInclude = { items: true, assignments: true };

  const fallbackOwnerIds: string[] = [];
  if (user.email === 'owner@3dtitans.com') fallbackOwnerIds.push('owner-1');
  if (user.email === 'aboude.murad@gmail.com') fallbackOwnerIds.push('owner-2');
  if (user.email === 'admin@3dtitans.com' || user.email === 'yahyademeriah@gmail.com') {
    fallbackOwnerIds.push('admin-1', 'admin-ya');
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
          ...(fallbackOwnerIds.length
            ? [{ assignments: { some: { ownerId: { in: fallbackOwnerIds } } } }]
            : []),
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
            create: assignedAdminIds.map((ownerId: string) => ({
              ownerId,
            })),
          }
        : undefined,
    },
    include: { items: true, assignments: true },
  });

  return NextResponse.json({ order: mapOrder(order) });
}
