import { orderReference } from '@/lib/payments/common';

/**
 * Shape an Order row for API responses.
 * `viewer` controls payment details: only admins (and the customer for their
 * own order) see references / proof; store owners just see whether it's paid.
 */
export function mapOrder(order: any, viewer: 'admin' | 'customer' | 'owner' = 'customer') {
  const base: Record<string, any> = {
    id: order.id,
    reference: orderReference(order.id),
    userId: order.userId || '',
    orderDate: order.createdAt,
    updatedAt: order.updatedAt,
    totalAmount: Number(order.totalAmount),
    status: order.status,
    items: (order.items || []).map((item: any) => ({
      productId: item.productId || '',
      name: item.name,
      quantity: item.quantity,
      price: Number(item.price),
      imageUrl: item.imageUrl || '',
    })),
    productIds: (order.items || []).map((i: any) => i.productId || ''),
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
    paymentMethod: order.paymentMethod || null,
    paymentStatus: order.paymentStatus || 'pending',
    paidAt: order.paidAt || null,
  };
  if (viewer === 'admin' || viewer === 'customer') {
    base.paymentReference = order.paymentReference || null;
    base.hasPaymentProof = !!order.paymentProofUrl;
  }
  return base;
}
