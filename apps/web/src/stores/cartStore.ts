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
        const existingItem = get().items.find((item) => item.productId === product.id);
        const previousQuantity = existingItem?.quantity ?? 0;

        // Optimistically update local state
        set((state) => {
          const existing = state.items.find((item) => item.productId === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.productId === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          } else {
            return {
              items: [...state.items, { productId: product.id, quantity, product }],
            };
          }
        });

        // Sync with server
        try {
          await api.addToCart(product.id, quantity);
        } catch (error) {
          console.error('Failed to sync cart with server:', error);
          // Revert only this specific operation
          set((state) => {
            if (previousQuantity === 0) {
              // Remove the item we just added
              return { items: state.items.filter((item) => item.productId !== product.id) };
            } else {
              // Restore the previous quantity
              return {
                items: state.items.map((item) =>
                  item.productId === product.id
                    ? { ...item, quantity: previousQuantity }
                    : item
                ),
              };
            }
          });
        }
      },

      removeItem: async (productId: number) => {
        // Capture the item before removing for potential restoration
        const removedItem = get().items.find((item) => item.productId === productId);
        
        if (!removedItem) return;

        // Optimistically update local state
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));

        // Sync with server
        try {
          await api.removeFromCart(productId);
        } catch (error) {
          console.error('Failed to remove from cart on server:', error);
          // Revert by re-adding the removed item
          set((state) => ({
            items: [...state.items, removedItem],
          }));
        }
      },

      updateQuantity: async (productId: number, quantity: number) => {
        if (quantity <= 0) {
          await get().removeItem(productId);
          return;
        }

        // Capture previous quantity for this specific item
        const previousQuantity = get().items.find((item) => item.productId === productId)?.quantity;
        
        if (previousQuantity === undefined) return;

        // Optimistically update local state
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        }));

        // Sync with server
        try {
          await api.updateCartItem(productId, quantity);
        } catch (error) {
          console.error('Failed to update cart on server:', error);
          // Revert only this specific item's quantity
          set((state) => ({
            items: state.items.map((item) =>
              item.productId === productId ? { ...item, quantity: previousQuantity } : item
            ),
          }));
        }
      },

      clearCart: async () => {
        // Capture all items for potential restoration
        const previousItems = [...get().items];
        
        if (previousItems.length === 0) return;

        // Optimistically update local state
        set({ items: [] });

        // Sync with server
        try {
          await api.clearCart();
        } catch (error) {
          console.error('Failed to clear cart on server:', error);
          // Revert by restoring previous items, merging with any new items
          set((state) => ({
            items: [...state.items, ...previousItems],
          }));
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

