import * as Sentry from '@sentry/cloudflare';
import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { Env, Variables } from '../types/bindings';

/**
 * Custom API error class with optional cache headers
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: Record<string, string[]>,
    public cacheHeaders?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Global error handler for the API
 */
export const errorHandler: ErrorHandler<{ Bindings: Env; Variables: Variables }> = (
  err,
  c
) => {
  console.error('Error:', err);

  // Capture error in Sentry with context
  const user = c.get('user');
  Sentry.captureException(err, {
    contexts: {
      request: {
        url: c.req.url,
        method: c.req.method,
        headers: Object.fromEntries(c.req.raw.headers),
      },
    },
    user: user ? { 
      id: user.id.toString(), 
      username: user.username 
    } : undefined,
    tags: {
      error_type: err.name,
      endpoint: new URL(c.req.url).pathname,
    },
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    err.errors.forEach((error) => {
      const path = error.path.join('.');
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(error.message);
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
        },
      },
      400
    );
  }

  // Handle custom API errors
  if (err instanceof ApiError) {
    // Apply cache headers if present
    if (err.cacheHeaders) {
      Object.entries(err.cacheHeaders).forEach(([key, value]) => {
        c.header(key, value);
      });
    }
    
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.status as 400 | 401 | 403 | 404 | 500
    );
  }

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: err.message,
        },
      },
      err.status
    );
  }

  // Handle unknown errors
  const isDev = c.env?.ENVIRONMENT === 'development';

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: isDev ? err.message : 'An unexpected error occurred',
      },
    },
    500
  );
};

/**
 * Create common API errors
 */
// Aggressive cache headers for public 404 responses (24 hours, stale for 7 days)
// Only use for truly public resources like products and images
const PUBLIC_404_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
  'CDN-Cache-Control': 'public, max-age=86400',
};

export const errors = {
  unauthorized: (message = 'Unauthorized') => new ApiError('UNAUTHORIZED', message, 401),

  forbidden: (message = 'Forbidden') => new ApiError('FORBIDDEN', message, 403),

  // Default notFound - NO caching (safe for authenticated/user-specific resources)
  notFound: (resource = 'Resource') => 
    new ApiError('NOT_FOUND', `${resource} not found`, 404),

  // Cached notFound - ONLY for public resources (products, images)
  // Do NOT use for cart, orders, user, or admin resources
  notFoundCached: (resource = 'Resource') => 
    new ApiError('NOT_FOUND', `${resource} not found`, 404, undefined, PUBLIC_404_CACHE_HEADERS),

  validation: (message: string, details?: Record<string, string[]>) =>
    new ApiError('VALIDATION_ERROR', message, 400, details),

  accountLocked: () => new ApiError('ACCOUNT_LOCKED', 'Account is locked', 403),

  invalidCredentials: () =>
    new ApiError('INVALID_CREDENTIALS', 'Invalid username or password', 401),

  outOfStock: (productName?: string) =>
    new ApiError('OUT_OF_STOCK', productName ? `${productName} is out of stock` : 'Out of stock', 400),

  cartEmpty: () => new ApiError('CART_EMPTY', 'Cart is empty', 400),

  internal: (message = 'Internal server error') =>
    new ApiError('INTERNAL_ERROR', message, 500),
};

