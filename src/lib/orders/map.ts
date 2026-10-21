import { orderReference } from '@/lib/payments/common';

/**
 * Who is looking at the order:
 *  - admin:    everything
 *  - customer: their own order (payment reference / proof flag, but no store-owner ids)
 *  - owner:    a store owner assigned to the order (contact + shipping details, payment status only)
 *  - pool:     a store owner looking at an unclaimed pooled order — only items,
 *              city and total until they claim it (no name, address, phone, email, notes)
 */
export type OrderViewer = 'admin' | 'customer' | 'owner' | 'pool';

/** Shape an Order row for API responses. */
export function mapOrder(order: any, viewer: OrderViewer = 'customer') {
  const restricted = viewer === 'pool';
  const base: Record<string, any> = {
    id: order.id,
    reference: orderReference(order.id),
    userId: restricted ? '' : order.userId || '',
    orderDate: order.createdAt,
    updatedAt: order.updatedAt,
    totalAmount: Number(order.totalAmount),
    // Currency the order was priced in (null on legacy orders → show the store currency).
    currency: order.currency || null,
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
      fullName: restricted ? '' : order.shippingName,
      addressLine1: restricted ? '' : order.shippingAddress1,
      city: order.shippingCity,
      postalCode: restricted ? '' : order.shippingPostalCode || '',
      country: restricted ? '' : order.shippingCountry,
    },
    phoneNumber: restricted ? '' : order.phoneNumber,
    customerEmail: restricted ? '' : order.customerEmail || '',
    notes: restricted ? '' : order.notes || '',
    predictedFinishDate: order.predictedFinishAt || undefined,
    isPrioritized: order.isPrioritized || false,
    // Store-owner user ids are internal: only admins and the owners themselves see them.
    assignedAdminIds: viewer === 'admin' || viewer === 'owner' ? order.assignments?.map((a: any) => a.ownerId) || [] : [],
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
