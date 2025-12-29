/**
 * Cloudflare Pages Function - API Catch-all Route
 * This handles all /api/* requests using the Hono application
 */
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';

// Import route handlers
import { authRoutes } from './_api/routes/auth';
import { productRoutes } from './_api/routes/products';
import { cartRoutes } from './_api/routes/cart';
import { orderRoutes } from './_api/routes/orders';
import { imageRoutes } from './_api/routes/images';
import { adminRoutes } from './_api/routes/admin';
import { errorHandler } from './_api/middleware/error-handler';
import type { Env, Variables } from './_api/types/bindings';

// Create Hono app
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', timing());
app.use('*', logger());

// Secure headers - disable crossOriginResourcePolicy as images route handles it
app.use('*', secureHeaders({
  crossOriginResourcePolicy: false,
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: c.env.ENVIRONMENT || 'production',
    },
  });
});

// API Routes - mounted at /api prefix
app.route('/api/auth', authRoutes);
app.route('/api/products', productRoutes);
app.route('/api/cart', cartRoutes);
app.route('/api/orders', orderRoutes);
app.route('/api/images', imageRoutes);
app.route('/api/admin', adminRoutes);

// Error handling
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    },
    404
  );
});

// Export for Cloudflare Pages Functions
export const onRequest: PagesFunction<Env> = async (context) => {
  return app.fetch(context.request, context.env, context);
};
