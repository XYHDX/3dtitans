'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/lib/types';

export type CartItem = Product & {
  quantity: number;
};

type CartState = {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
  total: number;
};

const calculateTotal = (cart: CartItem[]) => {
  return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      total: 0,
      addToCart: (product, quantity = 1) => {
        const cart = get().cart;
        const findProduct = cart.find((p) => p.id === product.id);

        if (findProduct) {
          findProduct.quantity += quantity;
        } else {
          cart.push({ ...product, quantity });
        }
        
        set({ cart: [...cart], total: calculateTotal(cart) });
      },
      removeFromCart: (productId) => {
        const newCart = get().cart.filter((p) => p.id !== productId);
        set({ cart: newCart, total: calculateTotal(newCart) });
      },
      updateQuantity: (productId, quantity) => {
        const cart = get().cart;
        const findProduct = cart.find((p) => p.id === productId);

        if (findProduct) {
          if (quantity <= 0) {
            get().removeFromCart(productId);
          } else {
            findProduct.quantity = quantity;
            set({ cart: [...cart], total: calculateTotal(cart) });
          }
        }
      },
      clearCart: () => {
        set({ cart: [], total: 0 });
      },
      getItemQuantity: (productId) => {
        const findProduct = get().cart.find((p) => p.id === productId);
        return findProduct ? findProduct.quantity : 0;
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("An error occurred during cart rehydration:", error);
        }
        if (state) {
            state.total = calculateTotal(state.cart);
        }
      },
    }
  )
);
