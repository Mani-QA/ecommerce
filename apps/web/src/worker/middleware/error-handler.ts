import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { Env, Variables } from '../types/bindings';

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: Record<string, string[]>
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
export const errors = {
  unauthorized: (message = 'Unauthorized') => new ApiError('UNAUTHORIZED', message, 401),

  forbidden: (message = 'Forbidden') => new ApiError('FORBIDDEN', message, 403),

  notFound: (resource = 'Resource') => new ApiError('NOT_FOUND', `${resource} not found`, 404),

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

