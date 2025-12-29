/**
 * Cloudflare Worker - Main Entry Point
 * Handles API requests using Hono and serves static assets
 */
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';

// Import route handlers
import { authRoutes } from './routes/auth';
import { productRoutes } from './routes/products';
import { cartRoutes } from './routes/cart';
import { orderRoutes } from './routes/orders';
import { imageRoutes } from './routes/images';
import { adminRoutes } from './routes/admin';
import { errorHandler } from './middleware/error-handler';
import type { Env, Variables } from './types/bindings';

// Create Hono app for API routes
const api = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
api.use('*', timing());
api.use('*', logger());

// Secure headers - disable crossOriginResourcePolicy as images route handles it
api.use(
  '*',
  secureHeaders({
    crossOriginResourcePolicy: false,
  })
);

// Health check
api.get('/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: c.env.ENVIRONMENT || 'production',
    },
  });
});

// API Routes
api.route('/auth', authRoutes);
api.route('/products', productRoutes);
api.route('/cart', cartRoutes);
api.route('/orders', orderRoutes);
api.route('/images', imageRoutes);
api.route('/admin', adminRoutes);

// Error handling
api.onError(errorHandler);

// 404 handler for API
api.notFound((c) => {
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

// Main app that handles all requests
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Mount API routes under /api
app.route('/api', api);

// Export default worker
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle API requests with Hono
    if (url.pathname.startsWith('/api')) {
      return app.fetch(request, env, ctx);
    }

    // For non-API requests, let the assets binding handle it
    // This is handled automatically by Cloudflare Workers Static Assets
    return env.ASSETS.fetch(request);
  },
};

