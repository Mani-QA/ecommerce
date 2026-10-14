import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import type { Product } from '@qademo/shared';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { filterProducts } from './catalog';
import { normalizeExpiry, placeOrder, toOrderInput } from './orders';
import { openPage } from './navigation';
import { presentOrder } from './present';
import StoreAgentTools, { adminToolNames, customerToolNames } from './StoreAgentTools';
import type { AgentRuntime } from './runtime';

vi.mock('@/lib/api', () => ({
  api: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    getProductById: vi.fn(),
    getCart: vi.fn(),
    addToCart: vi.fn(),
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    getOrders: vi.fn(),
    getOrder: vi.fn(),
    createOrder: vi.fn(),
    getAdminStats: vi.fn(),
    updateProductStock: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
}));

vi.mock('@/stores/authStore', () => {
  const state = {
    user: null as { id: number; username: string; userType: 'standard' | 'admin'; email?: string } | null,
    isAuthenticated: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  };
  const useAuthStore = (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state);
  useAuthStore.getState = () => state;
  return { useAuthStore };
});

vi.mock('@/stores/cartStore', () => ({
  useCartStore: {
    setState: vi.fn(),
    getState: () => ({ items: [] }),
  },
}));

const headphones: Product = {
  id: 1,
  name: 'Wireless Headphones',
  slug: 'wireless-headphones',
  description: 'Over-ear audio',
  price: 49.5,
  stock: 5,
  imageKey: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const speaker: Product = {
  ...headphones,
  id: 2,
  name: 'Bluetooth Speaker',
  slug: 'bluetooth-speaker',
  description: 'Portable speaker',
  price: 80,
  stock: 0,
};

interface RegisteredTool {
  name: string;
  annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean };
  execute: (input: object, options: { signal: AbortSignal }) => Promise<unknown>;
}

class FakeModelContext extends EventTarget {
  readonly tools = new Map<string, RegisteredTool>();

  async registerTool(tool: RegisteredTool, options?: { signal?: AbortSignal }) {
    this.tools.set(tool.name, tool);
    options?.signal?.addEventListener('abort', () => {
      this.tools.delete(tool.name);
    });
  }

  async getTools() {
    return [...this.tools.values()];
  }

  ontoolchange: ((event: Event) => void) | null = null;
}

const modelContext = new FakeModelContext();

function runtime(): AgentRuntime {
  return {
    navigate: vi.fn(),
    queryClient: {
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    },
  } as unknown as AgentRuntime;
}

function signal() {
  return new AbortController().signal;
}

describe('catalog filtering', () => {
  it('matches name, price, and stock together', () => {
    const matches = filterProducts([headphones, speaker], {
      query: 'head',
      maxPrice: 50,
      inStockOnly: true,
    });

    expect(matches.map((product) => product.id)).toEqual([1]);
  });
});

describe('checkout input', () => {
  const fields = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    address: '1 Test Street',
    cardNumber: '4242 4242 4242 4242',
    expiryDate: '1230',
    cvv: '123',
    cardholderName: 'Ada Lovelace',
  };

  it('accepts a spaced test card and an expiry without a slash', () => {
    expect(normalizeExpiry('1230')).toBe('12/30');
    const order = toOrderInput(fields);
    expect(order).toMatchObject({
      payment: { cardNumber: '4242424242424242', expiryDate: '12/30' },
    });
  });

  it('rejects a card that fails the Luhn check without echoing the number', () => {
    const order = toOrderInput({ ...fields, cardNumber: '1234123412341234' });
    expect(order).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
    expect(JSON.stringify(order)).not.toContain('1234123412341234');
  });
});

describe('order presentation', () => {
  it('keeps the last four digits and leaves out the network address', () => {
    const view = presentOrder({
      id: 9,
      userId: 3,
      totalAmount: 49.5,
      status: 'pending',
      shippingFirstName: 'Ada',
      shippingLastName: 'Lovelace',
      shippingAddress: '1 Test Street',
      paymentLastFour: '4242',
      ipAddress: '203.0.113.8',
      country: 'US',
      city: 'Testville',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(view.paymentLastFour).toBe('4242');
    expect(view).not.toHaveProperty('ipAddress');
    expect(JSON.stringify(view)).not.toContain('203.0.113.8');
  });
});

describe('shopping tools', () => {
  const activeSignal = signal();

  beforeEach(() => {
    vi.clearAllMocks();
    const auth = useAuthStore.getState();
    auth.user = null;
    auth.isAuthenticated = false;
  });

  it('requires a signed-in shopper before checkout', async () => {
    const result = await placeOrder({}, activeSignal, runtime());
    expect(result).toMatchObject({ ok: false, error: { code: 'AUTH_REQUIRED' } });
    expect(api.createOrder).not.toHaveBeenCalled();
  });

  it('stops checkout when the cart is empty', async () => {
    const auth = useAuthStore.getState();
    auth.user = { id: 2, username: 'standard_user', userType: 'standard' };
    auth.isAuthenticated = true;
    vi.mocked(api.getCart).mockResolvedValue({ items: [], totalItems: 0, totalAmount: 0 });

    const result = await placeOrder(
      {
        firstName: 'Ada',
        lastName: 'Lovelace',
        address: '1 Test Street',
        cardNumber: '4242424242424242',
        expiryDate: '12/30',
        cvv: '123',
        cardholderName: 'Ada Lovelace',
      },
      activeSignal,
      runtime()
    );

    expect(result).toMatchObject({ ok: false, error: { code: 'CART_EMPTY' } });
    expect(api.createOrder).not.toHaveBeenCalled();
  });

  it('asks a guest to sign in before opening checkout', async () => {
    const agent = runtime();
    const result = await openPage({ page: 'checkout' }, activeSignal, agent);
    expect(result).toMatchObject({ ok: false, error: { code: 'AUTH_REQUIRED' } });
    expect(agent.navigate).not.toHaveBeenCalled();
  });
});

describe('WebMCP registration', () => {
  beforeEach(() => {
    modelContext.tools.clear();
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: modelContext,
    });
    const auth = useAuthStore.getState();
    auth.user = null;
    auth.isAuthenticated = false;
  });

  it('registers customer tools and keeps admin tools unavailable until an admin signs in', async () => {
    const queryClient = new QueryClient();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StoreAgentTools />
        </MemoryRouter>
      </QueryClientProvider>
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(modelContext.tools.has('search_products')).toBe(true);
    });

    for (const name of customerToolNames) {
      expect(modelContext.tools.has(name)).toBe(true);
    }
    for (const name of adminToolNames) {
      expect(modelContext.tools.has(name)).toBe(false);
    }
    expect(modelContext.tools.get('place_order')?.annotations?.consequentialHint).toBe(true);
    expect(modelContext.tools.get('search_products')?.annotations?.readOnlyHint).toBe(true);

    vi.mocked(api.getProducts).mockResolvedValue([headphones, speaker]);
    const search = modelContext.tools.get('search_products');
    const result = await search?.execute({ query: 'speaker', inStockOnly: false }, { signal: signal() });
    expect(result).toMatchObject({
      ok: true,
      totalMatches: 1,
      products: [{ slug: 'bluetooth-speaker' }],
    });

    view.unmount();
    await waitFor(() => {
      expect(modelContext.tools.size).toBe(0);
    });
  });

  it('registers admin tools for an admin session', async () => {
    const auth = useAuthStore.getState();
    auth.user = { id: 1, username: 'admin_user', userType: 'admin' };
    auth.isAuthenticated = true;
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StoreAgentTools />
        </MemoryRouter>
      </QueryClientProvider>
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(modelContext.tools.has('update_stock')).toBe(true);
    });
    expect(useCartStore.setState).not.toHaveBeenCalled();
  });
});
