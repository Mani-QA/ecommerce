import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types/bindings';

interface CacheOptions {
  maxAge?: number; // seconds
  staleWhileRevalidate?: number; // seconds
  private?: boolean;
}

/**
 * Edge caching middleware for GET requests
 * Uses Cloudflare's Cache API for optimal performance
 */
export function cacheMiddleware(options: CacheOptions = {}): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  const { maxAge = 60, staleWhileRevalidate = 300, private: isPrivate = false } = options;

  return async (c, next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      await next();
      return;
    }

    // Skip cache for authenticated requests if private caching is not enabled
    const authHeader = c.req.header('Authorization');
    if (authHeader && !isPrivate) {
      await next();
      return;
    }

    const cacheKey = new Request(c.req.url, {
      method: 'GET',
      headers: c.req.raw.headers,
    });

    const cache = caches.default;

    // Try to get from cache
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      // Return cached response with cache status header
      const response = new Response(cachedResponse.body, cachedResponse);
      response.headers.set('X-Cache-Status', 'HIT');
      return response;
    }

    // Execute the handler
    await next();

    // Only cache successful responses
    if (c.res.status === 200) {
      const cacheControl = isPrivate
        ? `private, max-age=${maxAge}`
        : `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`;

      c.res.headers.set('Cache-Control', cacheControl);
      c.res.headers.set('X-Cache-Status', 'MISS');

      // Store in cache asynchronously
      const responseToCache = c.res.clone();
      c.executionCtx.waitUntil(cache.put(cacheKey, responseToCache));
    }
  };
}

/**
 * Purge cache for specific URL patterns
 */
export async function purgeCache(patterns: string[]): Promise<void> {
  const cache = caches.default;

  await Promise.all(
    patterns.map(async (pattern) => {
      const request = new Request(pattern);
      await cache.delete(request);
    })
  );
}

/**
 * No-cache middleware for dynamic endpoints
 */
export function noCacheMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    c.res.headers.set('Pragma', 'no-cache');
  };
}

