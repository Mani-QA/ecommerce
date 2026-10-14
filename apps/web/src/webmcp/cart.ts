import type { Cart, Product } from '@qademo/shared';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { resolveProduct, type ProductLookup } from './catalog';
import { presentCart } from './present';
import { cancelled, isToolFailure, parseInput, readError, toolError, type ToolFailure } from './result';
import type { AgentRuntime } from './runtime';

const quantityField = z.number().int().min(0).max(99);

const addInput = z
  .object({
    productId: z.number().int().positive().optional(),
    slug: z.string().trim().min(1).max(200).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    quantity: z.number().int().positive().max(99).default(1),
  })
  .superRefine(requireOneIdentifier);

const quantityInput = z
  .object({
    productId: z.number().int().positive().optional(),
    slug: z.string().trim().min(1).max(200).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    quantity: quantityField,
  })
  .superRefine(requireOneIdentifier);

export async function readCart(signal: AbortSignal) {
  const stop = cancelled(signal);
  if (stop) return stop;
  return loadCart(signal);
}

export async function addToCart(input: unknown, signal: AbortSignal, runtime: AgentRuntime) {
  const stop = cancelled(signal);
  if (stop) return stop;

  const parsed = parseInput(addInput, input);
  if (isToolFailure(parsed)) return parsed;

  try {
    const product = await resolveProduct(parsed.data, signal);
    if (isToolFailure(product)) return product;
    const quantity = parsed.data.quantity ?? 1;
    const cart = await api.getCart(signal);
    const existing = cart.items.find((item) => item.productId === product.id)?.quantity ?? 0;
    const stockError = ensureAvailable(product, existing + quantity);
    if (stockError) return stockError;

    await api.addToCart(product.id, quantity, signal);
    return finishCartChange(signal, runtime);
  } catch (error) {
    return readError(error);
  }
}

export async function setCartQuantity(input: unknown, signal: AbortSignal, runtime: AgentRuntime) {
  const stop = cancelled(signal);
  if (stop) return stop;

  const parsed = parseInput(quantityInput, input);
  if (isToolFailure(parsed)) return parsed;

  try {
    const product = await resolveProduct(parsed.data, signal);
    if (isToolFailure(product)) return product;
    const stockError = parsed.data.quantity === 0 ? null : ensureAvailable(product, parsed.data.quantity);
    if (stockError) return stockError;
    await writeQuantity(product.id, parsed.data.quantity, signal);
    return finishCartChange(signal, runtime);
  } catch (error) {
    return readError(error);
  }
}

export async function clearCart(signal: AbortSignal, runtime: AgentRuntime) {
  const stop = cancelled(signal);
  if (stop) return stop;

  try {
    await api.clearCart(signal);
    return finishCartChange(signal, runtime);
  } catch (error) {
    return readError(error);
  }
}

function requireOneIdentifier(
  value: ProductLookup,
  context: z.RefinementCtx
) {
  const identifiers = [value.productId, value.slug, value.name].filter((item) => item !== undefined);
  if (identifiers.length !== 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide exactly one of productId, slug, or name.',
    });
  }
}

function ensureAvailable(product: Product, nextQuantity: number): ToolFailure | null {
  if (nextQuantity <= product.stock) {
    return null;
  }
  return toolError(
    'OUT_OF_STOCK',
    `${product.name} has ${product.stock} units available, which is below the requested quantity of ${nextQuantity}.`
  );
}

async function writeQuantity(productId: number, quantity: number, signal: AbortSignal) {
  if (quantity === 0) {
    await api.removeFromCart(productId, signal);
    return;
  }
  await api.updateCartItem(productId, quantity, signal);
}

async function finishCartChange(signal: AbortSignal, runtime: AgentRuntime) {
  const cart = await loadCart(signal);
  if (!isToolFailure(cart)) {
    void runtime.queryClient.invalidateQueries({ queryKey: ['products'] });
  }
  return cart;
}

async function loadCart(signal: AbortSignal) {
  try {
    const cart = await api.getCart(signal);
    if (signal.aborted) {
      return toolError('CANCELLED', 'The tool call was cancelled.');
    }
    applyCart(cart);
    return { ok: true as const, cart: presentCart(cart) };
  } catch (error) {
    return readError(error);
  }
}

function applyCart(cart: Cart) {
  useCartStore.setState({
    items: cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      product: item.product,
    })),
    isLoading: false,
  });
}
