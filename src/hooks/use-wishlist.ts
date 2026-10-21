'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSessionUser } from '@/hooks/use-session';

/**
 * Tiny wishlist client store.
 *
 * Uses a module-level Set so all hook instances share state without needing
 * Zustand or Context — wishlist actions are infrequent (a click here and there)
 * and the dataset stays small (handful to dozens of IDs).
 *
 * Subscribes to a custom event so toggling on one card updates the heart on
 * every other card showing the same product.
 */
const STORE: Set<string> = new Set();
/** User whose wishlist is in STORE (null = nothing loaded). */
let loadedFor: string | null = null;
/** One shared request, so a grid of 24 cards doesn't fire 24 identical fetches. */
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function load(userId: string): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch('/api/wishlist', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      STORE.clear();
      (data.items || []).forEach((it: any) => STORE.add(it.id));
      loadedFor = userId;
      emit();
    } catch {
      // Keep whatever we had; the next mount retries.
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useWishlist() {
  const { user } = useSessionUser();
  const userId = user?.id || null;
  const [, force] = useState(0);

  // Load once per signed-in user; forget the previous user's hearts on logout / switch.
  useEffect(() => {
    if (!userId) {
      if (loadedFor !== null || STORE.size > 0) {
        STORE.clear();
        loadedFor = null;
        emit();
      }
      return;
    }
    if (loadedFor !== userId) load(userId);
  }, [userId]);

  // Subscribe to store updates
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const isWishlisted = useCallback((productId: string) => STORE.has(productId), []);

  const toggle = useCallback(
    async (productId: string) => {
      if (!user) return { wishlisted: false, requiresLogin: true };
      // Optimistic UI
      const was = STORE.has(productId);
      if (was) STORE.delete(productId);
      else STORE.add(productId);
      emit();

      try {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        // Reconcile with server truth
        if (data.wishlisted) STORE.add(productId);
        else STORE.delete(productId);
        emit();
        return { wishlisted: !!data.wishlisted };
      } catch {
        // Roll back optimistic change
        if (was) STORE.add(productId);
        else STORE.delete(productId);
        emit();
        return { wishlisted: was, error: true };
      }
    },
    [user]
  );

  const refresh = useCallback(() => (userId ? load(userId) : Promise.resolve()), [userId]);

  return { isWishlisted, toggle, refresh, count: STORE.size };
}
