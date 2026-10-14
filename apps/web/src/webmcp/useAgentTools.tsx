import type { MutableRefObject } from 'react';
import { useWebMCP } from 'usewebmcp';
import { readStoreStats, updateOrderStatus, updateStock } from './admin';
import { createAccount, readSession, signIn, signOut } from './account';
import { addToCart, clearCart, readCart, setCartQuantity } from './cart';
import { getProduct, searchProducts } from './catalog';
import { openPage } from './navigation';
import { getOrder, listOrders, placeOrder } from './orders';
import type { AgentRuntime } from './runtime';
import {
  addToCartSchema,
  cartSchema,
  clearCartSchema,
  createAccountSchema,
  openPageSchema,
  orderIdSchema,
  orderStatusSchema,
  ordersSchema,
  placeOrderSchema,
  productLookupSchema,
  searchProductsSchema,
  sessionSchema,
  setCartQuantitySchema,
  signInSchema,
  statsSchema,
  stockSchema,
} from './schemas';

type RuntimeRef = MutableRefObject<AgentRuntime>;

const readOnly = { readOnlyHint: true } as const;
const userContent = { readOnlyHint: true, untrustedContentHint: true } as const;

export function useCustomerTools(runtime: RuntimeRef) {
  useCatalogTools(runtime);
  useCartTools(runtime);
  useAccountTools(runtime);
  useOrderTools(runtime);
  useNavigationTool(runtime);
}

export function useAdminTools(runtime: RuntimeRef, enabled: boolean) {
  useWebMCP({
    name: 'get_store_stats',
    title: 'Read store stats',
    description: 'Read admin counts for products, orders, customers, pending orders, and low-stock products.',
    inputSchema: statsSchema,
    annotations: readOnly,
    enabled,
    execute: (_input, { signal }) => readStoreStats(signal),
  });
  useWebMCP({
    name: 'update_stock',
    title: 'Update product stock',
    description: 'Set how many units of a product are available to buy.',
    inputSchema: stockSchema,
    annotations: { consequentialHint: true },
    enabled,
    execute: (input, { signal }) => updateStock(input, signal, runtime.current),
  });
  useWebMCP({
    name: 'update_order_status',
    title: 'Update order status',
    description: 'Set an order to pending, processing, shipped, delivered, or cancelled.',
    inputSchema: orderStatusSchema,
    annotations: { consequentialHint: true },
    enabled,
    execute: (input, { signal }) => updateOrderStatus(input, signal, runtime.current),
  });
}

function useCatalogTools(runtime: RuntimeRef) {
  useWebMCP({
    name: 'search_products',
    title: 'Search products',
    description:
      'Search the catalog by keywords, highest price, and stock. Returns product id, slug, price, and the product page path.',
    inputSchema: searchProductsSchema,
    annotations: readOnly,
    execute: (input, { signal }) => searchProducts(input, signal, runtime.current),
  });
  useWebMCP({
    name: 'get_product',
    title: 'Get product',
    description: 'Load one product by numeric id, URL slug, or name. Returns price, stock, and the product page path.',
    inputSchema: productLookupSchema,
    annotations: readOnly,
    execute: (input, { signal }) => getProduct(input, signal),
  });
}

function useCartTools(runtime: RuntimeRef) {
  useWebMCP({
    name: 'get_cart',
    title: 'Get cart',
    description: 'Read the current cart, including each line, quantity, and the order total.',
    inputSchema: cartSchema,
    annotations: readOnly,
    execute: (_input, { signal }) => readCart(signal),
  });
  useWebMCP({
    name: 'add_to_cart',
    title: 'Add to cart',
    description: 'Add a catalog product to the cart. Identify it by id, slug, or name, and set how many units to add.',
    inputSchema: addToCartSchema,
    execute: (input, { signal }) => addToCart(input, signal, runtime.current),
  });
  useWebMCP({
    name: 'set_cart_quantity',
    title: 'Set cart quantity',
    description: 'Set the quantity of a product in the cart. A quantity of 0 removes that product.',
    inputSchema: setCartQuantitySchema,
    execute: (input, { signal }) => setCartQuantity(input, signal, runtime.current),
  });
  useWebMCP({
    name: 'clear_cart',
    title: 'Clear cart',
    description: 'Remove every item from the shopping cart.',
    inputSchema: clearCartSchema,
    execute: (_input, { signal }) => clearCart(signal, runtime.current),
  });
}

function useAccountTools(runtime: RuntimeRef) {
  useWebMCP({
    name: 'get_session',
    title: 'Get session',
    description: 'Read who is signed in, including username and role.',
    inputSchema: sessionSchema,
    annotations: userContent,
    execute: () => readSession(),
  });
  useWebMCP({
    name: 'sign_in',
    title: 'Sign in',
    description: 'Sign in with a username and password, then refresh the shopper session.',
    inputSchema: signInSchema,
    execute: (input, { signal }) => signIn(input, signal, runtime.current),
  });
  useWebMCP({
    name: 'sign_out',
    title: 'Sign out',
    description: 'Sign out of the current account.',
    inputSchema: sessionSchema,
    execute: (_input, { signal }) => signOut(signal),
  });
  useWebMCP({
    name: 'create_account',
    title: 'Create account',
    description:
      'Create a customer account and sign in. Requires an email, phone number, and a password with 8 characters, one uppercase letter, and one number.',
    inputSchema: createAccountSchema,
    execute: (input, { signal }) => createAccount(input, signal, runtime.current),
  });
}

function useOrderTools(runtime: RuntimeRef) {
  useWebMCP({
    name: 'list_orders',
    title: 'List orders',
    description: 'List orders placed by the signed-in shopper, newest first.',
    inputSchema: ordersSchema,
    annotations: userContent,
    execute: (_input, { signal }) => listOrders(signal),
  });
  useWebMCP({
    name: 'get_order',
    title: 'Get order',
    description: 'Load one order by id, including items, status, total, and shipping details.',
    inputSchema: orderIdSchema,
    annotations: userContent,
    execute: (input, { signal }) => getOrder(input, signal),
  });
  useWebMCP({
    name: 'place_order',
    title: 'Place order',
    description:
      'Place an order for the current cart with a shipping address and payment card. This completes checkout for the cart.',
    inputSchema: placeOrderSchema,
    annotations: { consequentialHint: true, untrustedContentHint: true },
    execute: (input, { signal }) => placeOrder(input, signal, runtime.current),
  });
}

function useNavigationTool(runtime: RuntimeRef) {
  useWebMCP({
    name: 'open_page',
    title: 'Open page',
    description:
      'Open a store page so the shopper can see the current result. Use product with a slug, or order with an orderId.',
    inputSchema: openPageSchema,
    execute: (input, { signal }) => openPage(input, signal, runtime.current),
  });
}
