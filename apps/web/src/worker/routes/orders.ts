import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createOrderSchema, isValidCardNumber, getCardLastFour } from '@qademo/shared';
import type { Env, Variables, ProductRow, OrderRow, OrderItemRow } from '../types/bindings';
import { orderRowToOrder } from '../types/bindings';
import { errors } from '../middleware/error-handler';
import { authMiddleware } from '../middleware/auth';
import { noCacheMiddleware } from '../middleware/cache';

interface CartData {
  items: Array<{ productId: number; quantity: number }>;
  updatedAt: string;
}

const orderRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Orders routes should not be cached
orderRoutes.use('*', noCacheMiddleware());
// All order routes require authentication
orderRoutes.use('*', authMiddleware());

/**
 * GET /api/orders
 * List orders for current user
 */
orderRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const db = c.env.DB;

  const orders = await db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .bind(user.id)
    .all<OrderRow>();

  return c.json({
    success: true,
    data: orders.results.map(orderRowToOrder),
    meta: {
      total: orders.results.length,
    },
  });
});

/**
 * GET /api/orders/:id
 * Get order details with items
 */
orderRoutes.get('/:id', async (c) => {
  const user = c.get('user')!;
  const orderId = parseInt(c.req.param('id'), 10);
  const db = c.env.DB;

  if (isNaN(orderId) || orderId <= 0) {
    throw errors.validation('Invalid order ID');
  }

  // Get order (check ownership unless admin)
  let order: OrderRow | null;
  
  if (user.userType === 'admin') {
    order = await db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .bind(orderId)
      .first<OrderRow>();
  } else {
    order = await db
      .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
      .bind(orderId, user.id)
      .first<OrderRow>();
  }

  if (!order) {
    throw errors.notFound('Order');
  }

  // Get order items with product names
  const items = await db
    .prepare(
      `SELECT oi.*, p.name as product_name 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`
    )
    .bind(orderId)
    .all<OrderItemRow & { product_name: string }>();

  const orderData = orderRowToOrder(order);

  return c.json({
    success: true,
    data: {
      ...orderData,
      items: items.results.map((item) => ({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        productName: item.product_name,
      })),
    },
  });
});

/**
 * POST /api/orders
 * Create a new order (checkout)
 */
orderRoutes.post('/', zValidator('json', createOrderSchema), async (c) => {
  const user = c.get('user')!;
  const { shipping, payment } = c.req.valid('json');
  const db = c.env.DB;
  const kv = c.env.KV_SESSIONS;
  const sessionId = c.req.header('X-Session-ID');

  // Validate card number (Luhn algorithm)
  if (!isValidCardNumber(payment.cardNumber)) {
    throw errors.validation('Invalid card number', {
      'payment.cardNumber': ['Card number failed validation'],
    });
  }

  // Get cart from session
  if (!sessionId) {
    throw errors.cartEmpty();
  }

  const cartKey = `cart:${sessionId}`;
  const cartData = await kv.get<CartData>(cartKey, 'json');

  if (!cartData || cartData.items.length === 0) {
    throw errors.cartEmpty();
  }

  // Fetch products and validate stock
  const productIds = cartData.items.map((item) => item.productId);
  const placeholders = productIds.map(() => '?').join(',');

  const products = await db
    .prepare(`SELECT * FROM products WHERE id IN (${placeholders}) AND is_active = 1`)
    .bind(...productIds)
    .all<ProductRow>();

  const productMap = new Map(products.results.map((p) => [p.id, p]));

  // Validate all items exist and have sufficient stock
  let totalAmount = 0;
  const orderItems: Array<{ productId: number; quantity: number; price: number }> = [];

  for (const item of cartData.items) {
    const product = productMap.get(item.productId);
    
    if (!product) {
      throw errors.notFound('Product');
    }

    if (product.stock < item.quantity) {
      throw errors.outOfStock(product.name);
    }

    totalAmount += product.price * item.quantity;
    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: product.price,
    });
  }

  // Create order in a transaction-like manner
  // D1 doesn't support transactions, so we do our best
  const paymentLastFour = getCardLastFour(payment.cardNumber);

  const orderResult = await db
    .prepare(
      `INSERT INTO orders (user_id, total_amount, status, shipping_first_name, shipping_last_name, shipping_address, payment_last_four)
       VALUES (?, ?, 'pending', ?, ?, ?, ?)`
    )
    .bind(
      user.id,
      totalAmount,
      shipping.firstName,
      shipping.lastName,
      shipping.address,
      paymentLastFour
    )
    .run();

  const orderId = orderResult.meta.last_row_id as number;

  // Create order items
  for (const item of orderItems) {
    await db
      .prepare(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
      )
      .bind(orderId, item.productId, item.quantity, item.price)
      .run();

    // Reduce stock
    await db
      .prepare('UPDATE products SET stock = stock - ?, updated_at = datetime("now") WHERE id = ?')
      .bind(item.quantity, item.productId)
      .run();
  }

  // Clear cart
  await kv.delete(cartKey);

  // Fetch the created order
  const order = await db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .bind(orderId)
    .first<OrderRow>();

  return c.json(
    {
      success: true,
      data: order ? orderRowToOrder(order) : { id: orderId },
    },
    201
  );
});

export { orderRoutes };

