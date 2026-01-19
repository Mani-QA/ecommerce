import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createProductSchema, updateProductSchema } from '@qademo/shared';
import { slugify } from '@qademo/shared';
import type { Env, Variables, ProductRow } from '../types/bindings';
import { productRowToProduct } from '../types/bindings';
import { errors } from '../middleware/error-handler';
import { purgeCache } from '../middleware/cache';
import { adminMiddleware } from '../middleware/auth';

const productRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/products
 * List all active products with aggressive CDN edge caching (24 hours)
 */
productRoutes.get('/', async (c) => {
  const db = c.env.DB;

  const { results } = await db
    .prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name')
    .all<ProductRow>();

  const products = (results as ProductRow[]).map((row) => {
    const product = productRowToProduct(row);
    // Add image URL if image exists
    if (product.imageKey) {
      product.imageUrl = `/api/images/${product.imageKey}`;
    }
    return product;
  });

  // Aggressive CDN edge caching: 24 hours fresh, serve stale for up to 7 days while revalidating
  c.header('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  c.header('CDN-Cache-Control', 'public, max-age=86400');
  c.header('Vary', 'Accept-Encoding');

  return c.json({
    success: true,
    data: products,
    meta: {
      total: products.length,
    },
  });
});

/**
 * GET /api/products/:slug
 * Get product by slug with aggressive CDN edge caching (24 hours)
 */
productRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = c.env.DB;

  // Skip caching for special routes
  if (slug === 'id') {
    return c.notFound();
  }

  const product = await db
    .prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1')
    .bind(slug)
    .first<ProductRow>();

  if (!product) {
    // Cache 404 for non-existent products (public resource)
    throw errors.notFoundCached('Product');
  }

  const result = productRowToProduct(product);
  if (result.imageKey) {
    result.imageUrl = `/api/images/${result.imageKey}`;
  }

  // Log out-of-stock product access (100% capture)
  if (result.stock === 0) {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const country = c.req.header('CF-IPCountry') || 'unknown';
    const userAgent = c.req.header('User-Agent') || 'unknown';
    
    console.log(`[OUT_OF_STOCK] Product "${result.name}" (ID: ${result.id}) accessed while out of stock - IP: ${ip}, Country: ${country}, UA: ${userAgent.substring(0, 50)}`);
  }

  // Aggressive CDN edge caching: 24 hours fresh, serve stale for up to 7 days while revalidating
  c.header('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  c.header('CDN-Cache-Control', 'public, max-age=86400');
  c.header('Vary', 'Accept-Encoding');

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/products/id/:id
 * Get product by ID (for cart/order lookups) with aggressive CDN caching (24 hours)
 */
productRoutes.get('/id/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const db = c.env.DB;

  if (isNaN(id) || id <= 0) {
    throw errors.validation('Invalid product ID');
  }

  const product = await db
    .prepare('SELECT * FROM products WHERE id = ?')
    .bind(id)
    .first<ProductRow>();

  if (!product) {
    // Cache 404 for non-existent products (public resource)
    throw errors.notFoundCached('Product');
  }

  const result = productRowToProduct(product);
  if (result.imageKey) {
    result.imageUrl = `/api/images/${result.imageKey}`;
  }

  // Log out-of-stock product access by ID (100% capture)
  if (result.stock === 0) {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const country = c.req.header('CF-IPCountry') || 'unknown';
    const userAgent = c.req.header('User-Agent') || 'unknown';
    
    console.log(`[OUT_OF_STOCK] Product "${result.name}" (ID: ${result.id}) accessed while out of stock - IP: ${ip}, Country: ${country}, UA: ${userAgent.substring(0, 50)}`);
  }

  // Aggressive CDN edge caching: 24 hours fresh, serve stale for up to 7 days
  c.header('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  c.header('CDN-Cache-Control', 'public, max-age=86400');

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/products
 * Create a new product (admin only)
 */
productRoutes.post(
  '/',
  adminMiddleware(),
  zValidator('json', createProductSchema),
  async (c) => {
    const data = c.req.valid('json');
    const db = c.env.DB;

    const slug = slugify(data.name);

    // Check if slug already exists
    const existing = await db
      .prepare('SELECT id FROM products WHERE slug = ?')
      .bind(slug)
      .first();

    if (existing) {
      throw errors.validation('Product with this name already exists');
    }

    const result = await db
      .prepare(
        `INSERT INTO products (name, slug, description, price, stock, image_key, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`
      )
      .bind(data.name, slug, data.description ?? null, data.price, data.stock, data.imageKey ?? null)
      .run();

    // Purge products cache
    await purgeCache([`${c.req.url.split('/api')[0]}/api/products`]);

    return c.json(
      {
        success: true,
        data: {
          id: result.meta.last_row_id,
          slug,
        },
      },
      201
    );
  }
);

/**
 * PATCH /api/products/:id
 * Update a product (admin only)
 */
productRoutes.patch(
  '/:id',
  adminMiddleware(),
  zValidator('json', updateProductSchema),
  async (c) => {
    const id = parseInt(c.req.param('id'), 10);
    const data = c.req.valid('json');
    const db = c.env.DB;

    if (isNaN(id) || id <= 0) {
      throw errors.validation('Invalid product ID');
    }

    // Check if product exists
    const existing = await db
      .prepare('SELECT * FROM products WHERE id = ?')
      .bind(id)
      .first<ProductRow>();

    if (!existing) {
      throw errors.notFound('Product');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);

      const newSlug = slugify(data.name);
      updates.push('slug = ?');
      values.push(newSlug);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (data.price !== undefined) {
      updates.push('price = ?');
      values.push(data.price);
    }

    if (data.stock !== undefined) {
      updates.push('stock = ?');
      values.push(data.stock);
    }

    if (data.imageKey !== undefined) {
      updates.push('image_key = ?');
      values.push(data.imageKey);
    }

    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      throw errors.validation('No fields to update');
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    await db
      .prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    // Purge cache
    await purgeCache([
      `${c.req.url.split('/api')[0]}/api/products`,
      `${c.req.url.split('/api')[0]}/api/products/${existing.slug}`,
    ]);

    return c.json({
      success: true,
      data: { id, updated: true },
    });
  }
);

/**
 * DELETE /api/products/:id
 * Soft delete a product (admin only)
 */
productRoutes.delete('/:id', adminMiddleware(), async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const db = c.env.DB;

  if (isNaN(id) || id <= 0) {
    throw errors.validation('Invalid product ID');
  }

  const existing = await db
    .prepare('SELECT slug FROM products WHERE id = ?')
    .bind(id)
    .first<{ slug: string }>();

  if (!existing) {
    throw errors.notFound('Product');
  }

  // Soft delete by setting is_active to 0
  await db
    .prepare('UPDATE products SET is_active = 0, updated_at = datetime("now") WHERE id = ?')
    .bind(id)
    .run();

  // Purge cache
  await purgeCache([
    `${c.req.url.split('/api')[0]}/api/products`,
    `${c.req.url.split('/api')[0]}/api/products/${existing.slug}`,
  ]);

  return c.json({
    success: true,
    data: { id, deleted: true },
  });
});

export { productRoutes };
