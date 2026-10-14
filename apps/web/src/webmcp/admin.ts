import { z } from 'zod';
import { api } from '@/lib/api';
import { cancelled, isToolFailure, parseInput, readError } from './result';
import type { AgentRuntime } from './runtime';
import { requireAdmin } from './session';

const stockInput = z.object({
  productId: z.number().int().positive(),
  stock: z.number().int().min(0).max(100000),
});

const statusInput = z.object({
  orderId: z.number().int().positive(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
});

export async function readStoreStats(signal: AbortSignal) {
  const stop = cancelled(signal);
  if (stop) return stop;
  const admin = requireAdmin();
  if (isToolFailure(admin)) return admin;

  try {
    const stats = await api.getAdminStats(signal);
    return { ok: true as const, stats };
  } catch (error) {
    return readError(error);
  }
}

export async function updateStock(input: unknown, signal: AbortSignal, runtime: AgentRuntime) {
  const stop = cancelled(signal);
  if (stop) return stop;
  const admin = requireAdmin();
  if (isToolFailure(admin)) return admin;

  const parsed = parseInput(stockInput, input);
  if (isToolFailure(parsed)) return parsed;

  try {
    const product = await api.updateProductStock(parsed.data.productId, parsed.data.stock, signal);
    void runtime.queryClient.invalidateQueries({ queryKey: ['products'] });
    void runtime.queryClient.invalidateQueries({ queryKey: ['admin'] });
    return { ok: true as const, product };
  } catch (error) {
    return readError(error);
  }
}

export async function updateOrderStatus(input: unknown, signal: AbortSignal, runtime: AgentRuntime) {
  const stop = cancelled(signal);
  if (stop) return stop;
  const admin = requireAdmin();
  if (isToolFailure(admin)) return admin;

  const parsed = parseInput(statusInput, input);
  if (isToolFailure(parsed)) return parsed;

  try {
    const order = await api.updateOrderStatus(parsed.data.orderId, parsed.data.status, signal);
    void runtime.queryClient.invalidateQueries({ queryKey: ['orders'] });
    void runtime.queryClient.invalidateQueries({ queryKey: ['admin'] });
    return { ok: true as const, order };
  } catch (error) {
    return readError(error);
  }
}
