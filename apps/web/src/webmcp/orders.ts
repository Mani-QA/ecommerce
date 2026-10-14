import { createOrderSchema, isValidCardNumber, type CreateOrderInput, type Order } from '@qademo/shared';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { presentOrder } from './present';
import { cancelled, isToolFailure, parseInput, readError, toolError, type ToolFailure } from './result';
import type { AgentRuntime } from './runtime';
import { requireUser } from './session';

const checkoutInput = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(500),
  cardNumber: z.string().trim().min(12).max(24),
  expiryDate: z.string().trim().min(4).max(7),
  cvv: z.string().trim().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
  cardholderName: z.string().trim().min(1).max(100),
});

const orderIdInput = z.object({
  orderId: z.number().int().positive(),
});

export type CheckoutFields = z.infer<typeof checkoutInput>;

export function normalizeExpiry(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 4 && !trimmed.includes('/')) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return trimmed;
}

export function toOrderInput(fields: CheckoutFields): CreateOrderInput | ToolFailure {
  const parsed = createOrderSchema.safeParse({
    shipping: {
      firstName: fields.firstName,
      lastName: fields.lastName,
      address: fields.address,
    },
    payment: {
      cardNumber: fields.cardNumber.replace(/[\s-]/g, ''),
      expiryDate: normalizeExpiry(fields.expiryDate),
      cvv: fields.cvv,
      cardholderName: fields.cardholderName,
    },
  });

  if (!parsed.success) {
    return toolError('VALIDATION', parsed.error.issues.map((issue) => issue.message).join('; '));
  }
  if (!isValidCardNumber(parsed.data.payment.cardNumber)) {
    return toolError(
      'VALIDATION',
      'The card number failed validation. QADemo accepts the test card 4242424242424242.'
    );
  }
  return parsed.data;
}

export async function listOrders(signal: AbortSignal) {
  const stop = cancelled(signal);
  if (stop) return stop;
  const user = requireUser();
  if (isToolFailure(user)) return user;

  try {
    const orders = await api.getOrders(signal);
    return { ok: true as const, orders: orders.map(presentOrder) };
  } catch (error) {
    return readError(error);
  }
}

export async function getOrder(input: unknown, signal: AbortSignal) {
  const stop = cancelled(signal);
  if (stop) return stop;
  const user = requireUser();
  if (isToolFailure(user)) return user;

  const parsed = parseInput(orderIdInput, input);
  if (isToolFailure(parsed)) return parsed;

  try {
    const order = await api.getOrder(parsed.data.orderId, signal);
    return { ok: true as const, order: presentOrder(order) };
  } catch (error) {
    return readError(error);
  }
}

export async function placeOrder(input: unknown, signal: AbortSignal, runtime: AgentRuntime) {
  const stop = cancelled(signal);
  if (stop) return stop;
  const user = requireUser();
  if (isToolFailure(user)) return user;

  const parsed = parseInput(checkoutInput, input);
  if (isToolFailure(parsed)) return parsed;
  const orderInput = toOrderInput(parsed.data);
  if (isToolFailure(orderInput)) return orderInput;

  try {
    const cart = await api.getCart(signal);
    if (cart.items.length === 0) {
      return toolError('CART_EMPTY', 'The cart is empty. Add a product with add_to_cart before placing an order.');
    }
    const created = await api.createOrder(orderInput, signal);
    const order = await loadPlacedOrder(created, signal);
    if (isToolFailure(order)) return order;
    useCartStore.setState({ items: [], isLoading: false });
    void runtime.queryClient.invalidateQueries({ queryKey: ['orders'] });
    void runtime.queryClient.invalidateQueries({ queryKey: ['products'] });
    runtime.navigate(`/orders/${order.id}`);
    return { ok: true as const, order: presentOrder(order) };
  } catch (error) {
    return readError(error);
  }
}

async function loadPlacedOrder(created: Order, signal: AbortSignal): Promise<Order | ToolFailure> {
  try {
    return await api.getOrder(created.id, signal);
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      return toolError('CANCELLED', 'The tool call was cancelled.');
    }
    return created;
  }
}
