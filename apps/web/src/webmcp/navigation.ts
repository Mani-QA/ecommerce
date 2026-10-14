import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { cancelled, isToolFailure, parseInput, toolError, type ToolFailure } from './result';
import type { AgentRuntime } from './runtime';

const pageInput = z.object({
  page: z.enum(['home', 'catalog', 'product', 'cart', 'checkout', 'login', 'signup', 'orders', 'order', 'admin']),
  slug: z.string().trim().min(1).max(200).optional(),
  orderId: z.number().int().positive().optional(),
});

type PageInput = z.infer<typeof pageInput>;

const staticPaths = {
  home: '/',
  catalog: '/catalog',
  cart: '/cart',
  checkout: '/checkout',
  login: '/login',
  signup: '/signup',
  orders: '/orders',
  admin: '/admin',
} as const;

export async function openPage(input: unknown, signal: AbortSignal, runtime: AgentRuntime) {
  const stop = cancelled(signal);
  if (stop) return stop;

  const parsed = parseInput(pageInput, input);
  if (isToolFailure(parsed)) return parsed;

  const destination = resolvePath(parsed.data);
  if (isToolFailure(destination)) return destination;

  runtime.navigate(destination.path);
  return { ok: true as const, path: destination.path };
}

function resolvePath(input: PageInput): { path: string } | ToolFailure {
  const user = useAuthStore.getState().user;
  const signedIn = useAuthStore.getState().isAuthenticated && user !== null;

  if (input.page === 'product') {
    if (!input.slug) {
      return toolError('VALIDATION', 'Opening a product page requires a slug.');
    }
    return { path: `/products/${encodeURIComponent(input.slug)}` };
  }

  if (input.page === 'order') {
    return orderPath(input.orderId, signedIn);
  }
  if ((input.page === 'checkout' || input.page === 'orders') && !signedIn) {
    return toolError('AUTH_REQUIRED', 'Sign in with sign_in before opening this page.');
  }
  if (input.page === 'admin' && user?.userType !== 'admin') {
    return toolError('FORBIDDEN', 'The admin page is available to admin accounts.');
  }
  return { path: staticPaths[input.page] };
}

function orderPath(orderId: number | undefined, signedIn: boolean): { path: string } | ToolFailure {
  if (!orderId) {
    return toolError('VALIDATION', 'Opening an order page requires an orderId.');
  }
  if (!signedIn) {
    return toolError('AUTH_REQUIRED', 'Sign in with sign_in before opening an order.');
  }
  return { path: `/orders/${orderId}` };
}
