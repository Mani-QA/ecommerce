import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@qademo/shared';
import { api } from '@/lib/api';

interface CartItem {
  productId: number;
  quantity: number;
  product: Product;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  
  // Actions
  addItem: (product: Product, quantity?: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  syncFromServer: () => Promise<void>;
  
  // Computed
  totalItems: () => number;
  totalAmount: () => number;
  getItem: (productId: number) => CartItem | undefined;
  isInCart: (productId: number) => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: async (product: Product, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find((item) => item.productId === product.id);

        // Optimistically update local state
        if (existingItem) {
          set({
            items: items.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({
            items: [...items, { productId: product.id, quantity, product }],
          });
        }

        // Sync with server
        try {
          await api.addToCart(product.id, quantity);
        } catch (error) {
          console.error('Failed to sync cart with server:', error);
          // Revert on error
          set({ items });
        }
      },

      removeItem: async (productId: number) => {
        const items = get().items;
        
        // Optimistically update local state
        set({
          items: items.filter((item) => item.productId !== productId),
        });

        // Sync with server
        try {
          await api.removeFromCart(productId);
        } catch (error) {
          console.error('Failed to remove from cart on server:', error);
          // Revert on error
          set({ items });
        }
      },

      updateQuantity: async (productId: number, quantity: number) => {
        const items = get().items;
        
        if (quantity <= 0) {
          await get().removeItem(productId);
          return;
        }

        // Optimistically update local state
        set({
          items: items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        });

        // Sync with server
        try {
          await api.updateCartItem(productId, quantity);
        } catch (error) {
          console.error('Failed to update cart on server:', error);
          // Revert on error
          set({ items });
        }
      },

      clearCart: async () => {
        const items = get().items;
        
        // Optimistically update local state
        set({ items: [] });

        // Sync with server
        try {
          await api.clearCart();
        } catch (error) {
          console.error('Failed to clear cart on server:', error);
          // Revert on error
          set({ items });
        }
      },

      syncFromServer: async () => {
        set({ isLoading: true });
        try {
          const cart = await api.getCart();
          set({
            items: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              product: item.product as Product,
            })),
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to sync cart from server:', error);
          set({ isLoading: false });
        }
      },

      totalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      totalAmount: () => {
        return get().items.reduce(
          (sum, item) => sum + item.quantity * item.product.price,
          0
        );
      },

      getItem: (productId: number) => {
        return get().items.find((item) => item.productId === productId);
      },

      isInCart: (productId: number) => {
        return get().items.some((item) => item.productId === productId);
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);

