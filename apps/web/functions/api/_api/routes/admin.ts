import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { updateStockSchema, updateOrderStatusSchema } from '@qademo/shared';
import type { Env, Variables, ProductRow, OrderRow } from '../types/bindings';
import { productRowToProduct, orderRowToOrder } from '../types/bindings';
import { errors } from '../middleware/error-handler';
import { adminMiddleware } from '../middleware/auth';
import { noCacheMiddleware, purgeCache } from '../middleware/cache';

const adminRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// All admin routes require authentication and admin role
adminRoutes.use('*', noCacheMiddleware());
adminRoutes.use('*', adminMiddleware());

/**
 * GET /api/admin/products
 * List all products (including inactive) for admin
 */
adminRoutes.get('/products', async (c) => {
  const db = c.env.DB;

  const products = await db
    .prepare('SELECT * FROM products ORDER BY name')
    .all<ProductRow>();

  return c.json({
    success: true,
    data: products.results.map((row) => {
      const product = productRowToProduct(row);
      if (product.imageKey) {
        product.imageUrl = `/api/images/${product.imageKey}`;
      }
      return product;
    }),
    meta: {
      total: products.results.length,
    },
  });
});

/**
 * PATCH /api/admin/products/:id/stock
 * Update product stock level
 */
adminRoutes.patch(
  '/products/:id/stock',
  zValidator('json', updateStockSchema),
  async (c) => {
    const id = parseInt(c.req.param('id'), 10);
    const { stock } = c.req.valid('json');
    const db = c.env.DB;

    if (isNaN(id) || id <= 0) {
      throw errors.validation('Invalid product ID');
    }

    // Check if product exists
    const existing = await db
      .prepare('SELECT slug FROM products WHERE id = ?')
      .bind(id)
      .first<{ slug: string }>();

    if (!existing) {
      throw errors.notFound('Product');
    }

    await db
      .prepare('UPDATE products SET stock = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(stock, id)
      .run();

    // Purge cache
    await purgeCache([
      `${c.req.url.split('/api')[0]}/api/products`,
      `${c.req.url.split('/api')[0]}/api/products/${existing.slug}`,
    ]);

    return c.json({
      success: true,
      data: { id, stock },
    });
  }
);

/**
 * GET /api/admin/orders
 * List all orders for admin
 */
adminRoutes.get('/orders', async (c) => {
  const db = c.env.DB;

  const orders = await db
    .prepare(
      `SELECT o.*, u.username 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       ORDER BY o.created_at DESC`
    )
    .all<OrderRow & { username: string }>();

  return c.json({
    success: true,
    data: orders.results.map((row) => ({
      ...orderRowToOrder(row),
      username: row.username,
    })),
    meta: {
      total: orders.results.length,
    },
  });
});

/**
 * GET /api/admin/orders/:id
 * Get order details for admin
 */
adminRoutes.get('/orders/:id', async (c) => {
  const orderId = parseInt(c.req.param('id'), 10);
  const db = c.env.DB;

  if (isNaN(orderId) || orderId <= 0) {
    throw errors.validation('Invalid order ID');
  }

  const order = await db
    .prepare(
      `SELECT o.*, u.username 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       WHERE o.id = ?`
    )
    .bind(orderId)
    .first<OrderRow & { username: string }>();

  if (!order) {
    throw errors.notFound('Order');
  }

  // Get order items
  const items = await db
    .prepare(
      `SELECT oi.*, p.name as product_name 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`
    )
    .bind(orderId)
    .all<{ id: number; order_id: number; product_id: number; quantity: number; unit_price: number; product_name: string }>();

  return c.json({
    success: true,
    data: {
      ...orderRowToOrder(order),
      username: order.username,
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
 * PATCH /api/admin/orders/:id/status
 * Update order status
 */
adminRoutes.patch(
  '/orders/:id/status',
  zValidator('json', updateOrderStatusSchema),
  async (c) => {
    const orderId = parseInt(c.req.param('id'), 10);
    const { status } = c.req.valid('json');
    const db = c.env.DB;

    if (isNaN(orderId) || orderId <= 0) {
      throw errors.validation('Invalid order ID');
    }

    // Check if order exists
    const existing = await db
      .prepare('SELECT id FROM orders WHERE id = ?')
      .bind(orderId)
      .first();

    if (!existing) {
      throw errors.notFound('Order');
    }

    await db
      .prepare('UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(status, orderId)
      .run();

    return c.json({
      success: true,
      data: { id: orderId, status },
    });
  }
);

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
adminRoutes.get('/stats', async (c) => {
  const db = c.env.DB;

  // Get counts
  const [productCount, orderCount, userCount, pendingOrders] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM orders').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").first<{ count: number }>(),
  ]);

  // Get recent orders
  const recentOrders = await db
    .prepare(
      `SELECT o.id, o.total_amount, o.status, o.created_at, u.username 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       ORDER BY o.created_at DESC 
       LIMIT 5`
    )
    .all<{ id: number; total_amount: number; status: string; created_at: string; username: string }>();

  // Get low stock products
  const lowStock = await db
    .prepare('SELECT id, name, stock FROM products WHERE is_active = 1 AND stock < 10 ORDER BY stock')
    .all<{ id: number; name: string; stock: number }>();

  return c.json({
    success: true,
    data: {
      counts: {
        products: productCount?.count || 0,
        orders: orderCount?.count || 0,
        users: userCount?.count || 0,
        pendingOrders: pendingOrders?.count || 0,
      },
      recentOrders: recentOrders.results.map((o) => ({
        id: o.id,
        totalAmount: o.total_amount,
        status: o.status,
        createdAt: o.created_at,
        username: o.username,
      })),
      lowStockProducts: lowStock.results,
    },
  });
});

export { adminRoutes };

