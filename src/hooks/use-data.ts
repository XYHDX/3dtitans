'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Order,
  Product,
  Upload,
  SiteSettings,
  ContactSubmission,
  NewsletterSubscription,
  Store,
} from '@/lib/types';

/** Thrown for non-2xx responses so callers can tell "failed" apart from "empty". */
async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Products

/**
 * Dashboard product list (admin / store owner) — `/api/products?scope=manage`.
 *
 * Admins get every product, store owners only their own; archived products are
 * included and flagged with `archived`. Never cached. Public pages use
 * useProductList / useFeaturedProducts instead.
 */
export function useProducts(filter?: { uploaderId?: string; storeId?: string; storeSlug?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ scope: 'manage' });
      if (filter?.uploaderId) params.set('uploaderId', filter.uploaderId);
      if (filter?.storeId) params.set('storeId', filter.storeId);
      if (filter?.storeSlug) params.set('storeSlug', filter.storeSlug);

      const data = await fetchJson(`/api/products?${params.toString()}`, { cache: 'no-store' });
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products', error);
      setProducts([]);
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, [filter?.storeId, filter?.storeSlug, filter?.uploaderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addProduct = useCallback(async (payload: Omit<Product, 'id'>) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setProducts((prev) => [data.product, ...prev]);
    return data.product as Product;
  }, []);

  const updateProduct = useCallback(async (id: string, patch: Partial<Product>) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setProducts((prev) => prev.map((p) => (p.id === id ? data.product : p)));
    return data.product as Product;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    if (data?.archived) {
      // "Delete" archives (orders keep their history): mirror what a reload would show.
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? ({ ...p, archived: true, archivedAt: new Date().toISOString() } as Product) : p))
      );
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    return true;
  }, []);

  const data = useMemo(() => {
    let result = products;
    if (filter?.uploaderId) result = result.filter((p) => p.uploaderId === filter.uploaderId);
    if (filter?.storeId) result = result.filter((p) => p.storeId === filter.storeId);

    const sorted = [...result].sort((a, b) => {
      const prioritizedDiff = Number(!!b.isPrioritizedStore) - Number(!!a.isPrioritizedStore);
      if (prioritizedDiff !== 0) return prioritizedDiff;
      const uploaderA = (a.storeName || a.uploaderName || '').toLowerCase();
      const uploaderB = (b.storeName || b.uploaderName || '').toLowerCase();
      const uploaderDiff = uploaderA.localeCompare(uploaderB);
      if (uploaderDiff !== 0) return uploaderDiff;
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      const reviewsDiff = (b.reviewCount || 0) - (a.reviewCount || 0);
      if (reviewsDiff !== 0) return reviewsDiff;
      const dateA = a.createdAt
        ? new Date((a.createdAt as any).toDate ? (a.createdAt as any).toDate() : (a.createdAt as any)).getTime()
        : 0;
      const dateB = b.createdAt
        ? new Date((b.createdAt as any).toDate ? (b.createdAt as any).toDate() : (b.createdAt as any)).getTime()
        : 0;
      return dateB - dateA;
    });

    return sorted;
  }, [products, filter?.uploaderId, filter?.storeId]);

  return { data, loading, error, refresh, addProduct, updateProduct, deleteProduct };
}

export type ProductListQuery = {
  q?: string;
  category?: string;
  storeSlug?: string;
  /** Page size (server default 24, max 60). */
  pageSize?: number;
};

export type ProductPage = { products: Product[]; nextOffset: number | null };

/** Matches the server default for /api/products. */
const DEFAULT_PAGE_SIZE = 24;

/**
 * Public, paginated product list (shop, store pages). Responses are CDN-cached.
 *
 * `error` is set when a page could not be loaded — callers must show an error
 * state with `retry`, never the "no products" message.
 * `initial` (server-rendered first page) skips the first request.
 */
export function useProductList(query: ProductListQuery, options?: { initial?: ProductPage }) {
  const { q = '', category = '', storeSlug = '', pageSize } = query;
  const key = JSON.stringify([q, category, storeSlug, pageSize ?? null]);
  const initialRef = useRef(options?.initial ? { key, page: options.initial } : null);

  const [products, setProducts] = useState<Product[]>(() => options?.initial?.products ?? []);
  const [nextOffset, setNextOffset] = useState<number | null>(() => options?.initial?.nextOffset ?? null);
  const [loading, setLoading] = useState(!options?.initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const buildUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (category.trim()) params.set('category', category.trim());
      if (storeSlug) params.set('storeSlug', storeSlug);
      // Always send `limit`: a request without paging params gets the legacy
      // un-paginated list kept for the published mobile app.
      params.set('limit', String(pageSize ?? DEFAULT_PAGE_SIZE));
      if (offset > 0) params.set('offset', String(offset));
      const qs = params.toString();
      return `/api/products${qs ? `?${qs}` : ''}`;
    },
    [q, category, storeSlug, pageSize]
  );

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    try {
      const data = await fetchJson(buildUrl(0));
      if (id !== requestId.current) return;
      setProducts(data.products || []);
      setNextOffset(typeof data.nextOffset === 'number' ? data.nextOffset : null);
    } catch (err) {
      if (id !== requestId.current) return;
      console.error('Failed to fetch products', err);
      setProducts([]);
      setNextOffset(null);
      setError('failed');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    // The server already rendered this exact page — no need to fetch it again.
    if (initialRef.current && initialRef.current.key === key) {
      initialRef.current = null;
      return;
    }
    initialRef.current = null;
    loadFirst();
  }, [key, loadFirst]);

  const loadMore = useCallback(async () => {
    if (nextOffset === null || loadingMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchJson(buildUrl(nextOffset));
      if (id !== requestId.current) return;
      const incoming: Product[] = data.products || [];
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...incoming.filter((p) => !seen.has(p.id))];
      });
      setNextOffset(typeof data.nextOffset === 'number' ? data.nextOffset : null);
    } catch (err) {
      if (id !== requestId.current) return;
      console.error('Failed to fetch more products', err);
      setError('failed');
    } finally {
      if (id === requestId.current) setLoadingMore(false);
    }
  }, [buildUrl, loadingMore, nextOffset]);

  /** Retry whatever failed: the next page if some products are shown, else the first page. */
  const retry = useCallback(() => {
    if (products.length > 0 && nextOffset !== null) return loadMore();
    return loadFirst();
  }, [loadFirst, loadMore, nextOffset, products.length]);

  return {
    data: products,
    loading,
    loadingMore,
    error,
    hasMore: nextOffset !== null,
    loadMore,
    retry,
  };
}

/** Home page "featured" strip: 6 products (prioritised stores first, then newest). */
export function useFeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson('/api/products?featured=1');
      setProducts(data.products || []);
    } catch (err) {
      console.error('Failed to fetch featured products', err);
      setProducts([]);
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data: products, loading, error, refresh };
}

/**
 * Fetch a single product by id from /api/products/[id].
 *
 * Use this on product detail pages instead of useProducts() — pulling the full
 * catalog just to find one row leaks every product's data (uploader IDs, prices,
 * descriptions, store info) to anyone who clicks any product card.
 */
export function useProduct(id: string | undefined | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        setProduct(null);
        setError('not_found');
        return;
      }
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setProduct(data.product || null);
    } catch (e: any) {
      setProduct(null);
      setError(e?.message || 'failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data: product, loading, error, refresh };
}

// Stores
export function useStores(filter?: { ownerId?: string; includeUnpublished?: boolean }, options?: { skipFetch?: boolean }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (options?.skipFetch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter?.ownerId) params.set('ownerId', filter.ownerId);
      if (filter?.includeUnpublished) params.set('published', 'false');
      const qs = params.toString();
      // Draft listings depend on the session — always fetch fresh.
      const data = await fetchJson(
        `/api/stores${qs ? `?${qs}` : ''}`,
        filter?.includeUnpublished ? { cache: 'no-store' } : undefined
      );
      setStores(data.stores || []);
    } catch (error) {
      console.error('Failed to fetch stores', error);
      setStores([]);
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, [filter?.includeUnpublished, filter?.ownerId, options?.skipFetch]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createStore = useCallback(async (payload: Partial<Store> & { name: string; slug: string }) => {
    const res = await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setStores((prev) => {
      const filtered = prev.filter((s) => s.id !== data.store.id);
      return [data.store, ...filtered];
    });
    return data.store as Store;
  }, []);

  const updateStore = useCallback(async (slug: string, patch: Partial<Store>) => {
    const res = await fetch(`/api/stores/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setStores((prev) => prev.map((s) => (s.id === data.store.id ? data.store : s)));
    return data.store as Store;
  }, []);

  return { data: stores, loading, error, refresh, createStore, updateStore };
}

export function useStore(slug?: string, options?: { skipFetch?: boolean }) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${encodeURIComponent(slug)}`);
      if (res.status === 404) {
        setStore(null);
        setError('not_found');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStore(data.store || null);
    } catch (error) {
      console.error('Failed to fetch store', error);
      setStore(null);
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (options?.skipFetch) {
      setLoading(false);
      return;
    }
    refresh();
  }, [options?.skipFetch, refresh]);

  return { data: store, loading, error, refresh };
}

// Uploads
export function useUploads(options?: { skipFetch?: boolean }) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson('/api/uploads');
      setUploads(data.uploads || []);
    } catch (error) {
      console.error('Failed to fetch uploads', error);
      setUploads([]);
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skipFetch) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, options?.skipFetch]);

  const addUpload = useCallback(async (payload: Omit<Upload, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setUploads((prev) => [data.upload, ...prev]);
    return data.upload as Upload;
  }, []);

  const deleteUpload = useCallback(async (id: string) => {
    const res = await fetch(`/api/uploads/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    setUploads((prev) => prev.filter((u) => u.id !== id));
    return true;
  }, []);

  const assignUpload = useCallback(async (id: string, assignedOwnerId: string | null) => {
    const res = await fetch(`/api/uploads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedOwnerId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.upload } : u)));
    return data.upload as Upload;
  }, []);

  return { data: uploads, loading, error, refresh, addUpload, deleteUpload, assignUpload };
}

// Orders
export function useOrders(filter?: { ownerId?: string; statusIn?: Order['status'][] }, options?: { skipFetch?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** The API returns the newest 100 orders; true when older ones exist. */
  const [hasMore, setHasMore] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson('/api/orders');
      setOrders(data.orders || []);
      setHasMore(!!data.nextCursor);
    } catch (error) {
      console.error('Failed to fetch orders', error);
      setOrders([]);
      setHasMore(false);
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skipFetch) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, options?.skipFetch]);

  const createOrder = useCallback(async (payload: any) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (data?.error as string) || 'Failed to place order' };
    setOrders((prev) => [data.order, ...prev]);
    return { ok: true, order: data.order as Order };
  }, []);

  const updateOrder = useCallback(async (id: string, patch: Partial<Order>) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      // The total is never sent — the server recomputes it (e.g. on prioritize).
      body: JSON.stringify({
        status: patch.status,
        predictedFinishDate: (patch as any).predictedFinishDate,
        isPrioritized: patch.isPrioritized,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to update order');
    setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
    return data.order as Order;
  }, []);

  const requestCancelOrder = useCallback(async (id: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestCancellation: true }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
    return data.order as Order;
  }, []);

  const releaseOrderToPool = useCallback(async (id: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ releaseToPool: true }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
    return data.order as Order;
  }, []);

  const claimOrder = useCallback(async (id: string, ownerId: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimForOwnerId: ownerId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
    return data.order as Order;
  }, []);

  const deleteOrder = useCallback(async (id: string) => {
    const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    setOrders((prev) => prev.filter((o) => o.id !== id));
    return true;
  }, []);

  const data = useMemo(() => {
    let result = orders;
    if (filter?.ownerId) {
      result = result.filter((o) => o.assignedAdminIds?.includes(filter.ownerId!));
    }
    if (filter?.statusIn) {
      result = result.filter((o) => filter.statusIn?.includes(o.status));
    }
    return result;
  }, [orders, filter?.ownerId, filter?.statusIn]);

  return { data, loading, error, hasMore, refresh, createOrder, updateOrder, requestCancelOrder, releaseOrderToPool, claimOrder, deleteOrder };
}

// Settings
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson('/api/settings');
      setSettings(data.settings || null);
    } catch (error) {
      console.error('Failed to fetch settings', error);
      setSettings(null);
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveSettings = useCallback(async (payload: SiteSettings) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    setSettings(payload);
    return true;
  }, []);

  return { data: settings, loading, error, refresh, saveSettings };
}

// Contact submissions
export function useContactSubmissions(options?: { skipFetch?: boolean }) {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson('/api/contact');
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error('Failed to fetch contact submissions', error);
      setSubmissions([]);
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skipFetch) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, options?.skipFetch]);

  const submitContact = useCallback(async (payload: Omit<ContactSubmission, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setSubmissions((prev) => [data.submission, ...prev]);
    return data.submission as ContactSubmission;
  }, []);

  return { data: submissions, loading, error, refresh, submitContact };
}

// Newsletter
export function useNewsletterSubscriptions(options?: { skipFetch?: boolean }) {
  const [subs, setSubs] = useState<NewsletterSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson('/api/newsletter');
      setSubs(data.subscriptions || []);
    } catch (error) {
      console.error('Failed to fetch newsletter subscriptions', error);
      setSubs([]);
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skipFetch) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, options?.skipFetch]);

  const subscribe = useCallback(async (email: string) => {
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => null);
    // The API answers { ok: true, subscription: { email } } — no id or date, so
    // nothing reveals whether the address was already subscribed.
    if (!res.ok || !data?.ok) return null;
    const subscription: NewsletterSubscription = {
      id: data.subscription?.id || '',
      email: data.subscription?.email || email,
      subscribedAt: data.subscription?.subscribedAt || new Date().toISOString(),
    };
    // Only rows with a real id belong in the admin list.
    if (subscription.id) {
      setSubs((prev) => [subscription, ...prev.filter((s) => s.id !== subscription.id)]);
    }
    return subscription;
  }, []);

  return { data: subs, loading, error, refresh, subscribe };
}
