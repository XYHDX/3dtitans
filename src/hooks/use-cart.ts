'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { Product } from '@/lib/types';
import { track } from '@/lib/analytics';

export type CartItem = Product & {
  quantity: number;
};

type CartState = {
  cart: CartItem[];
  total: number;

  // Mode flags — set by the sync effect below
  mode: 'guest' | 'user';
  userId: string | null;
  loading: boolean;

  // Mutators — same shape as before so consumers don't change
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;

  // Internals — used by the sync hook
  _setCart: (cart: CartItem[]) => void;
  _setMode: (mode: 'guest' | 'user', userId: string | null) => void;
  _setLoading: (loading: boolean) => void;
  /** Logout: forget the cart locally (memory + localStorage) WITHOUT touching the server cart. */
  _resetLocal: () => void;
};

const CART_STORAGE_KEY = 'cart-storage';

const calculateTotal = (cart: CartItem[]) =>
  cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

/**
 * Store currency for analytics events, loaded once per page (same source as
 * useCurrency). Falls back to USD — the store currency the client chose — so an
 * add-to-cart is never lost because the settings request failed.
 */
let currencyPromise: Promise<string> | null = null;
function storeCurrency(): Promise<string> {
  if (!currencyPromise) {
    currencyPromise = fetch('/api/payments/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const c = String(d?.settings?.['payment.currencyLabel'] || '').trim().toUpperCase();
        if (!c) currencyPromise = null; // retry on the next add
        return c || 'USD';
      })
      .catch(() => {
        currencyPromise = null;
        return 'USD';
      });
  }
  return currencyPromise;
}

function trackAddToCart(product: Product, quantity: number) {
  if (typeof window === 'undefined') return;
  void storeCurrency().then((currency) =>
    track('add_to_cart', {
      currency,
      value: Math.round(product.price * quantity * 100) / 100,
      items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity }],
    })
  );
}

/**
 * Hybrid cart store.
 *
 * - GUEST mode: cart lives in localStorage (zustand/persist), no network.
 * - USER mode:  cart lives on the server via /api/cart, mirrored to in-memory state.
 *
 * Consumers (CartSheet, ProductCard, checkout) just call addToCart / removeFromCart /
 * updateQuantity / clearCart and read `cart` + `total`. The mutators dispatch to the
 * server when in user mode, optimistically updating the in-memory cart for instant UX.
 *
 * The CartSync component below MUST be mounted once at app root (we mount it from
 * src/app/providers.tsx). It owns the login/logout transitions:
 *   - On login: pushes the localStorage cart to /api/cart/merge, then clears local,
 *     then fetches the merged server cart.
 *   - On logout (or any session loss): clears the cart in memory AND localStorage so
 *     the next person on a shared device doesn't inherit it. The server cart is kept.
 */
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      total: 0,
      mode: 'guest',
      userId: null,
      loading: false,

      addToCart: (product, quantity = 1) => {
        const cart = [...get().cart];
        const existing = cart.find((p) => p.id === product.id);
        const nextQty = Math.min(99, (existing?.quantity || 0) + quantity);
        if (existing) existing.quantity = nextQty;
        else cart.push({ ...product, quantity: nextQty });
        set({ cart, total: calculateTotal(cart) });
        trackAddToCart(product, quantity);

        if (get().mode === 'user') {
          // Fire-and-forget — error is non-fatal (next sync reconciles)
          fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: product.id, quantity, mode: 'add' }),
          }).catch(() => {});
        }
      },

      removeFromCart: (productId) => {
        const cart = get().cart.filter((p) => p.id !== productId);
        set({ cart, total: calculateTotal(cart) });
        if (get().mode === 'user') {
          fetch(`/api/cart?productId=${encodeURIComponent(productId)}`, { method: 'DELETE' }).catch(() => {});
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        const cart = [...get().cart];
        const found = cart.find((p) => p.id === productId);
        if (!found) return;
        found.quantity = Math.min(99, quantity);
        set({ cart, total: calculateTotal(cart) });
        if (get().mode === 'user') {
          fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity: found.quantity, mode: 'set' }),
          }).catch(() => {});
        }
      },

      clearCart: () => {
        set({ cart: [], total: 0 });
        if (get().mode === 'user') {
          fetch('/api/cart?all=1', { method: 'DELETE' }).catch(() => {});
        }
      },

      getItemQuantity: (productId) => {
        const found = get().cart.find((p) => p.id === productId);
        return found ? found.quantity : 0;
      },

      _setCart: (cart) => set({ cart, total: calculateTotal(cart) }),
      _setMode: (mode, userId) => set({ mode, userId }),
      _setLoading: (loading) => set({ loading }),
      _resetLocal: () => {
        set({ cart: [], total: 0, mode: 'guest', userId: null });
        try { localStorage.removeItem(CART_STORAGE_KEY); } catch {}
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist guest carts to localStorage. Logged-in carts live on the server.
      partialize: (state) => (state.mode === 'guest' ? { cart: state.cart } : { cart: [] }),
      onRehydrateStorage: () => (state) => {
        if (state) state.total = calculateTotal(state.cart);
      },
    }
  )
);

/**
 * CartSync — mounts at app root, owns login/logout transitions.
 *
 * Stateless: renders nothing, just listens for session changes and pushes
 * the cart store between guest mode and user mode.
 */
export function CartSync() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id || null;
  const _setCart    = useCart((s) => s._setCart);
  const _setMode    = useCart((s) => s._setMode);
  const _setLoading = useCart((s) => s._setLoading);
  const currentUserId = useCart((s) => s.userId);

  useEffect(() => {
    if (status === 'loading') return;

    // LOGGED OUT — a signed-in user just left: forget their cart locally (it
    // stays on the server). A visitor who was never signed in keeps their guest cart.
    if (!userId) {
      if (currentUserId !== null) {
        useCart.getState()._resetLocal();
      }
      return;
    }

    // LOGGED IN as a new user (or first sync after page load)
    if (userId !== currentUserId) {
      let cancelled = false;
      (async () => {
        _setLoading(true);
        try {
          // Step 1: snapshot the current in-memory cart (guest items) and clear local
          const guestCart = useCart.getState().cart;
          _setCart([]);

          // Step 2: merge guest cart into server cart
          if (guestCart.length > 0) {
            await fetch('/api/cart/merge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: guestCart.map((it) => ({ productId: it.id, quantity: it.quantity })),
              }),
            }).catch(() => {});
          }

          // Step 3: pull authoritative server cart
          const res = await fetch('/api/cart');
          const data = await res.json();
          if (cancelled) return;
          const items: CartItem[] = (data.items || []).map((it: any) => ({
            ...it.product,
            quantity: it.quantity,
          }));
          _setCart(items);
          _setMode('user', userId);

          // Step 4: clear localStorage cart-storage now that we're authoritative
          try { localStorage.removeItem(CART_STORAGE_KEY); } catch {}
        } finally {
          if (!cancelled) _setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [userId, status, currentUserId, _setCart, _setMode, _setLoading]);

  return null;
}
