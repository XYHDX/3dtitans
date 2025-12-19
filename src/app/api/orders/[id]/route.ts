import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
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
    notes: order.notes || '',
    predictedFinishDate: order.predictedFinishAt || undefined,
    isPrioritized: order.isPrioritized || false,
    assignedAdminIds: order.assignments?.map((a: any) => a.ownerId) || [],
  };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { status, predictedFinishDate, isPrioritized, releaseToPool, claimForOwnerId, totalAmount, requestCancellation } = body;

  const existing = await prisma.order.findUnique({
    where: { id: params.id },
    include: { assignments: true, items: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only admins or assigned store-owners can update.
  const isAdmin = user.role === 'admin';
  const isOwner = user.role === 'store-owner' && (existing.assignments || []).some((a) => a.ownerId === user.id);
  const isPooledClaim = user.role === 'store-owner' && existing.status === 'Pooled';
  const isCustomer =
    (!!existing.userId && existing.userId === user.id) ||
    (!!existing.customerEmail && !!user.email && existing.customerEmail.toLowerCase() === (user.email || '').toLowerCase());
  const isCustomerCancellation = !!requestCancellation && isCustomer;

  if (!isAdmin && !isOwner && !isPooledClaim && !isCustomerCancellation) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const data: any = {};
  if (isCustomerCancellation) {
    if (existing.status === 'Finished' || existing.status === 'Cancelled') {
      return NextResponse.json({ error: 'Order can no longer be cancelled' }, { status: 400 });
    }
    data.status = 'CancellationRequested';
  } else {
    if (status) data.status = status;
    if (typeof isPrioritized === 'boolean') data.isPrioritized = isPrioritized;
    if (predictedFinishDate) data.predictedFinishAt = new Date(predictedFinishDate);
    if (typeof totalAmount === 'number') data.totalAmount = totalAmount;
  }

  if (releaseToPool) {
    data.status = 'Pooled';
    await prisma.orderAssignment.deleteMany({ where: { orderId: params.id } });
  }

  if (claimForOwnerId) {
    // Allow admin or the claimant themselves. Store-owners can claim pooled orders.
    if (!isAdmin && user.id !== claimForOwnerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    await prisma.orderAssignment.upsert({
      where: { orderId_ownerId: { orderId: params.id, ownerId: claimForOwnerId } },
      update: { ownerEmail: user.email || null },
      create: { orderId: params.id, ownerId: claimForOwnerId, ownerEmail: user.email || null },
    });
    data.status = 'Pending';
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data,
    include: { assignments: true, items: true },
  });

  return NextResponse.json({ order: mapOrder(updated) });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, assignments: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.$transaction([
    prisma.orderAssignment.deleteMany({ where: { orderId: params.id } }),
    prisma.orderItem.deleteMany({ where: { orderId: params.id } }),
    prisma.order.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
