/**
 * Cloudflare Worker - Main Entry Point
 * Handles API requests using Hono and serves static assets
 * 
 * Caching Strategy:
 * - Images: Cached at CDN edge for 1 year (immutable)
 * - Products API: Cached at CDN edge for 5 minutes
 * - 404 responses: Cached at CDN edge for 1 hour
 * - Auth/Cart/Orders: No caching (dynamic content)
 */
import * as Sentry from '@sentry/cloudflare';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { getSentryConfig } from './lib/sentry-config';

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

// Global middleware (skip logger for cached routes to reduce overhead)
api.use('*', timing());

// Secure headers - disable crossOriginResourcePolicy as images route handles it
api.use(
  '*',
  secureHeaders({
    crossOriginResourcePolicy: false,
  })
);

// Health check - cache for 5 minutes
api.get('/health', (c) => {
  c.header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  c.header('CDN-Cache-Control', 'public, max-age=300');
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

// Debug endpoint for Sentry (development only)
api.get('/debug-sentry', (c) => {
  const isDev = c.env.ENVIRONMENT === 'development';
  
  if (!isDev) {
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
  }
  
  // This will trigger an error that Sentry should capture
  throw new Error('Test Sentry error - this should appear in Sentry.io');
});

// Error handling
api.onError(errorHandler);

// 404 handler for API - cache for 7 days to reduce Worker invocations
api.notFound((c) => {
  // Aggressive cache 404 responses at CDN edge for 7 days
  c.header('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=2592000');
  c.header('CDN-Cache-Control', 'public, max-age=604800');
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

// Export default worker wrapped with Sentry
export default Sentry.withSentry<Env>(
  (env: Env) => getSentryConfig(env),
  {
    async fetch(
      request: Request,
      env: Env,
      ctx: ExecutionContext
    ): Promise<Response> {
      const url = new URL(request.url);

      // Handle API requests with Hono
      if (url.pathname.startsWith('/api')) {
        // Check if this is a cacheable GET request
        if (request.method === 'GET') {
          const cacheKey = new Request(url.toString(), request);
          const cfCache = caches.default;
          
          // Check CDN cache first
          let response = await cfCache.match(cacheKey);
          
          if (response) {
            // Clone response and add cache hit header
            const cachedResponse = new Response(response.body, response);
            cachedResponse.headers.set('X-Cache', 'HIT');
            cachedResponse.headers.set('CF-Cache-Status', 'HIT');
            return cachedResponse;
          }
          
          // Cache miss - execute the handler
          response = await app.fetch(request, env, ctx);
          
          // Only cache successful GET responses with cache headers
          const cacheControl = response.headers.get('Cache-Control');
          if (response.ok && cacheControl && cacheControl.includes('s-maxage')) {
            // Clone response for caching
            const responseToCache = response.clone();
            ctx.waitUntil(cfCache.put(cacheKey, responseToCache));
            
            // Add cache miss header
            const finalResponse = new Response(response.body, response);
            finalResponse.headers.set('X-Cache', 'MISS');
            return finalResponse;
          }
          
          return response;
        }
        
        // Non-GET requests - no caching
        return app.fetch(request, env, ctx);
      }

      // Handle invalid file extensions that shouldn't hit the Worker
      // Cache these 404s at the edge for 30 days (aggressive caching)
      const invalidExtensions = ['.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py', '.exe', '.dll', '.env', '.git', '.sql', '.bak'];
      if (invalidExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext))) {
        const response = new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Resource not found',
            },
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=2592000, immutable',
              'CDN-Cache-Control': 'public, max-age=2592000',
            },
          }
        );
        
        // Cache this 404 response
        const cacheKey = new Request(url.toString(), request);
        ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
        
        return response;
      }

      // For non-API requests, let the assets binding handle it
      // This is handled automatically by Cloudflare Workers Static Assets
      return env.ASSETS.fetch(request);
    },
  }
);
