'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Order,
  Product,
  Upload,
  SiteSettings,
  ContactSubmission,
  NewsletterSubscription,
} from '@/lib/types';

// Products
export function useProducts(filter?: { uploaderId?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    setProducts((prev) => prev.filter((p) => p.id !== id));
    return true;
  }, []);

  const data = useMemo(() => {
    if (filter?.uploaderId) return products.filter((p) => p.uploaderId === filter.uploaderId);
    return products;
  }, [products, filter?.uploaderId]);

  return { data, loading, refresh, addProduct, updateProduct, deleteProduct };
}

// Uploads
export function useUploads(options?: { skipFetch?: boolean }) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/uploads');
      const data = await res.json();
      setUploads(data.uploads || []);
    } catch (error) {
      console.error('Failed to fetch uploads', error);
      setUploads([]);
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

  return { data: uploads, loading, refresh, addUpload, deleteUpload, assignUpload };
}

// Orders
export function useOrders(filter?: { ownerId?: string; statusIn?: Order['status'][] }, options?: { skipFetch?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders', error);
      setOrders([]);
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
    if (!res.ok) return { ok: false };
    const data = await res.json();
    setOrders((prev) => [data.order, ...prev]);
    return { ok: true, order: data.order as Order };
  }, []);

  const updateOrder = useCallback(async (id: string, patch: Partial<Order>) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: patch.status,
        predictedFinishDate: (patch as any).predictedFinishDate,
        isPrioritized: patch.isPrioritized,
        totalAmount: patch.totalAmount,
      }),
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
      result = result.filter((o) => o.assignedAdminIds?.includes(filter.ownerId));
    }
    if (filter?.statusIn) {
      result = result.filter((o) => filter.statusIn?.includes(o.status));
    }
    return result;
  }, [orders, filter?.ownerId, filter?.statusIn]);

  return { data, loading, refresh, createOrder, updateOrder, releaseOrderToPool, claimOrder, deleteOrder };
}

// Settings
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data.settings || null);
    } catch (error) {
      console.error('Failed to fetch settings', error);
      setSettings(null);
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

  return { data: settings, loading, refresh, saveSettings };
}

// Contact submissions
export function useContactSubmissions(options?: { skipFetch?: boolean }) {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contact');
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error('Failed to fetch contact submissions', error);
      setSubmissions([]);
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

  return { data: submissions, loading, refresh, submitContact };
}

// Newsletter
export function useNewsletterSubscriptions(options?: { skipFetch?: boolean }) {
  const [subs, setSubs] = useState<NewsletterSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/newsletter');
      const data = await res.json();
      setSubs(data.subscriptions || []);
    } catch (error) {
      console.error('Failed to fetch newsletter subscriptions', error);
      setSubs([]);
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
    if (!res.ok) return null;
    const data = await res.json();
    setSubs((prev) => [data.subscription, ...prev.filter((s: any) => s.id !== data.subscription.id)]);
    return data.subscription as NewsletterSubscription;
  }, []);

  return { data: subs, loading, refresh, subscribe };
}
