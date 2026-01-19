import * as Sentry from '@sentry/cloudflare';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { addToCartSchema, updateCartItemSchema } from '@qademo/shared';
import type { Env, Variables, ProductRow } from '../types/bindings';
import { productRowToProduct } from '../types/bindings';
import { errors } from '../middleware/error-handler';
import { noCacheMiddleware } from '../middleware/cache';

interface CartData {
  items: Array<{ productId: number; quantity: number }>;
  updatedAt: string;
}

const cartRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Cart routes should not be cached
cartRoutes.use('*', noCacheMiddleware());

/**
 * Get or create session ID from header
 */
function getSessionId(c: { req: { header: (name: string) => string | undefined } }): string {
  const sessionId = c.req.header('X-Session-ID');
  if (!sessionId) {
    throw errors.validation('Missing X-Session-ID header');
  }
  return sessionId;
}

/**
 * Get cart from KV store
 */
async function getCart(kv: KVNamespace, sessionId: string): Promise<CartData> {
  const cartKey = `cart:${sessionId}`;
  const cartData = await kv.get<CartData>(cartKey, 'json');
  return cartData || { items: [], updatedAt: new Date().toISOString() };
}

/**
 * Save cart to KV store
 */
async function saveCart(kv: KVNamespace, sessionId: string, cart: CartData): Promise<void> {
  const cartKey = `cart:${sessionId}`;
  cart.updatedAt = new Date().toISOString();
  // Cart expires after 7 days of inactivity
  await kv.put(cartKey, JSON.stringify(cart), { expirationTtl: 7 * 24 * 60 * 60 });
}

/**
 * GET /api/cart
 * Get current cart with product details
 */
cartRoutes.get('/', async (c) => {
  const sessionId = getSessionId(c);
  const kv = c.env.KV_SESSIONS;
  const db = c.env.DB;

  const cart = await getCart(kv, sessionId);

  if (cart.items.length === 0) {
    return c.json({
      success: true,
      data: {
        items: [],
        totalItems: 0,
        totalAmount: 0,
      },
    });
  }

  // Fetch product details for cart items
  const productIds = cart.items.map((item) => item.productId);
  const placeholders = productIds.map(() => '?').join(',');
  
  const products = await db
    .prepare(`SELECT * FROM products WHERE id IN (${placeholders}) AND is_active = 1`)
    .bind(...productIds)
    .all<ProductRow>();

  const productMap = new Map(
    products.results.map((p) => [p.id, productRowToProduct(p)])
  );

  // Build cart response with product details
  const cartItems = cart.items
    .map((item) => {
      const product = productMap.get(item.productId);
      if (!product) return null;

      return {
        productId: item.productId,
        quantity: item.quantity,
        product: {
          ...product,
          imageUrl: product.imageKey ? `/api/images/${product.imageKey}` : null,
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.product.price,
    0
  );

  return c.json({
    success: true,
    data: {
      items: cartItems,
      totalItems,
      totalAmount,
    },
  });
});

/**
 * POST /api/cart/items
 * Add item to cart
 */
cartRoutes.post('/items', zValidator('json', addToCartSchema), async (c) => {
  const sessionId = getSessionId(c);
  const { productId, quantity } = c.req.valid('json');
  const kv = c.env.KV_SESSIONS;
  const db = c.env.DB;

  // Verify product exists and has stock
  const product = await db
    .prepare('SELECT * FROM products WHERE id = ? AND is_active = 1')
    .bind(productId)
    .first<ProductRow>();

  if (!product) {
    throw errors.notFound('Product');
  }

  const cart = await getCart(kv, sessionId);
  const existingItem = cart.items.find((item) => item.productId === productId);

  const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

  if (newQuantity > product.stock) {
    throw errors.outOfStock(product.name);
  }

  if (existingItem) {
    existingItem.quantity = newQuantity;
  } else {
    cart.items.push({ productId, quantity });
  }

  await saveCart(kv, sessionId, cart);

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  // Track cart metrics
  Sentry.metrics.count('cart.item_added', 1, {
    tags: { product_id: productId.toString() },
  });
  
  Sentry.metrics.gauge('cart.total_items', totalItems);

  return c.json({
    success: true,
    data: {
      productId,
      quantity: newQuantity,
      totalItems,
    },
  });
});

/**
 * PATCH /api/cart/items/:productId
 * Update item quantity in cart
 */
cartRoutes.patch(
  '/items/:productId',
  zValidator('json', updateCartItemSchema),
  async (c) => {
    const sessionId = getSessionId(c);
    const productId = parseInt(c.req.param('productId'), 10);
    const { quantity } = c.req.valid('json');
    const kv = c.env.KV_SESSIONS;
    const db = c.env.DB;

    if (isNaN(productId) || productId <= 0) {
      throw errors.validation('Invalid product ID');
    }

    const cart = await getCart(kv, sessionId);
    const itemIndex = cart.items.findIndex((item) => item.productId === productId);

    if (itemIndex === -1) {
      throw errors.notFound('Cart item');
    }

    if (quantity === 0) {
      // Remove item from cart
      cart.items.splice(itemIndex, 1);
    } else {
      // Verify stock
      const product = await db
        .prepare('SELECT stock, name FROM products WHERE id = ?')
        .bind(productId)
        .first<{ stock: number; name: string }>();

      if (product && quantity > product.stock) {
        throw errors.outOfStock(product.name);
      }

      cart.items[itemIndex].quantity = quantity;
    }

    await saveCart(kv, sessionId, cart);

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return c.json({
      success: true,
      data: {
        productId,
        quantity,
        totalItems,
      },
    });
  }
);

/**
 * DELETE /api/cart/items/:productId
 * Remove item from cart
 */
cartRoutes.delete('/items/:productId', async (c) => {
  const sessionId = getSessionId(c);
  const productId = parseInt(c.req.param('productId'), 10);
  const kv = c.env.KV_SESSIONS;

  if (isNaN(productId) || productId <= 0) {
    throw errors.validation('Invalid product ID');
  }

  const cart = await getCart(kv, sessionId);
  const itemIndex = cart.items.findIndex((item) => item.productId === productId);

  if (itemIndex === -1) {
    throw errors.notFound('Cart item');
  }

  cart.items.splice(itemIndex, 1);
  await saveCart(kv, sessionId, cart);

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  // Track cart removal metrics
  Sentry.metrics.count('cart.item_removed', 1, {
    tags: { product_id: productId.toString() },
  });
  
  Sentry.metrics.gauge('cart.total_items', totalItems);

  return c.json({
    success: true,
    data: {
      productId,
      removed: true,
      totalItems,
    },
  });
});

/**
 * DELETE /api/cart
 * Clear entire cart
 */
cartRoutes.delete('/', async (c) => {
  const sessionId = getSessionId(c);
  const kv = c.env.KV_SESSIONS;

  const cartKey = `cart:${sessionId}`;
  await kv.delete(cartKey);

  // Track cart cleared metrics
  Sentry.metrics.count('cart.cleared', 1);

  return c.json({
    success: true,
    data: {
      cleared: true,
      totalItems: 0,
    },
  });
});

export { cartRoutes };

