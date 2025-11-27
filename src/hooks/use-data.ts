'use client';

import { useAppStore } from '@/lib/app-store';
import { useMemo } from 'react';
import type { Order, Product, Upload, SiteSettings, ContactSubmission, NewsletterSubscription, UserProfile } from '@/lib/types';

export function useProducts(filter?: { uploaderId?: string }) {
  const products = useAppStore((s) => s.products);
  const data = useMemo(() => {
    if (filter?.uploaderId) return products.filter((p) => p.uploaderId === filter.uploaderId);
    return products;
  }, [products, filter?.uploaderId]);
  return { data, loading: false };
}

export function useUploads() {
  const uploads = useAppStore((s) => s.uploads);
  return { data: uploads, loading: false };
}

export function useOrders(filter?: { ownerId?: string; statusIn?: Order['status'][] }) {
  const orders = useAppStore((s) => s.orders);
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
  return { data, loading: false };
}

export function useSiteSettings() {
  const siteSettings = useAppStore((s) => s.siteSettings);
  return { data: siteSettings as SiteSettings, loading: false };
}

export function useContactSubmissions() {
  const contactSubmissions = useAppStore((s) => s.contactSubmissions);
  return { data: contactSubmissions as ContactSubmission[], loading: false };
}

export function useNewsletterSubscriptions() {
  const newsletterSubscriptions = useAppStore((s) => s.newsletterSubscriptions);
  return { data: newsletterSubscriptions as NewsletterSubscription[], loading: false };
}

export function useUserList() {
  const users = useAppStore((s) => s.users);
  return { data: users as (UserProfile & { id: string })[], loading: false };
}
