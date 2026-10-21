'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Order } from '@/lib/types';

/** Extra fields the orders API sends on top of the shared `Order` type. */
export type ListedOrder = Order & {
  /** Currency the order was priced in (null on legacy orders → store currency). */
  currency?: string | null;
  /** Admin only: other orders whose manual-payment reference is the same transfer. */
  referenceUsedOnOtherOrders?: { reference: string; paymentStatus: string }[];
};

export type OrderListQuery = {
  status?: string[];
  paymentStatus?: string;
  /** Store owners: 'assigned' = my orders, 'pool' = unclaimed pooled orders. */
  scope?: 'assigned' | 'pool';
  limit?: number;
};

/** Error carrying the API's message (already user-readable) and optional code. */
export class OrderApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function readJson(res: Response) {
  return res.json().catch(() => ({} as Record<string, any>));
}

/**
 * Paged order list for the admin / store-owner pages (GET /api/orders with a
 * cursor). Mutations return the updated order from the API and replace it in
 * place; they throw OrderApiError with the server's message on failure.
 */
export function useOrderList(query: OrderListQuery, enabled = true) {
  const [orders, setOrders] = useState<ListedOrder[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const statusKey = query.status?.join(',') || '';
  const search = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', String(query.limit || 50));
    if (statusKey) p.set('status', statusKey);
    if (query.paymentStatus) p.set('paymentStatus', query.paymentStatus);
    if (query.scope) p.set('scope', query.scope);
    return p.toString();
  }, [query.limit, statusKey, query.paymentStatus, query.scope]);

  const fetchPage = useCallback(
    async (cursor?: string) => {
      const res = await fetch(`/api/orders?${search}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, {
        cache: 'no-store',
      });
      const data = await readJson(res);
      if (!res.ok) throw new OrderApiError(data.error || 'Failed to load orders', res.status, data.code);
      return { orders: (data.orders || []) as ListedOrder[], nextCursor: (data.nextCursor as string | null) || null };
    },
    [search]
  );

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPage();
      if (id !== requestId.current) return;
      setOrders(page.orders);
      setNextCursor(page.nextCursor);
    } catch (err: any) {
      if (id !== requestId.current) return;
      setOrders([]);
      setNextCursor(null);
      setError(err?.message || 'Failed to load orders');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextCursor);
      if (id !== requestId.current) return;
      setOrders((prev) => {
        const seen = new Set(prev.map((o) => o.id));
        return [...prev, ...page.orders.filter((o) => !seen.has(o.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (err: any) {
      setError(err?.message || 'Failed to load orders');
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, nextCursor]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    refresh();
  }, [enabled, refresh]);

  const replace = useCallback((order: ListedOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...order } : o)));
  }, []);

  /** PATCH /api/orders/[id] with any of the actions the API accepts. */
  const patchOrder = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await readJson(res);
      if (!res.ok) throw new OrderApiError(data.error || 'Failed to update order', res.status, data.code);
      if (data.order) replace(data.order as ListedOrder);
      return data.order as ListedOrder;
    },
    [replace]
  );

  const deleteOrder = useCallback(async (id: string) => {
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await readJson(res);
    if (!res.ok) throw new OrderApiError(data.error || 'Failed to delete order', res.status, data.code);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  /** Drop an order from the list (e.g. it was claimed and left the pool). */
  const remove = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  return { orders, loading, loadingMore, error, hasMore: !!nextCursor, refresh, loadMore, patchOrder, deleteOrder, remove };
}
