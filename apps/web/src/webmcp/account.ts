import { signupSchema } from '@qademo/shared';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { presentUser } from './present';
import { cancelled, isToolFailure, parseInput, readError, toolError } from './result';
import type { AgentRuntime } from './runtime';

const signInInput = z.object({
  username: z.string().trim().min(1, 'Username is required').max(255),
  password: z.string().min(1, 'Password is required').max(200),
});

export function readSession() {
  const { user, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !user) {
    return { ok: true as const, signedIn: false, user: null };
  }
  return { ok: true as const, signedIn: true, user: presentUser(user) };
}

export async function signIn(input: unknown, signal: AbortSignal, runtime: AgentRuntime) {
  const stop = cancelled(signal);
  if (stop) return stop;

  const parsed = parseInput(signInInput, input);
  if (isToolFailure(parsed)) return parsed;

  try {
    await useAuthStore.getState().login(parsed.data.username, parsed.data.password, signal);
    if (signal.aborted) {
      return toolError('CANCELLED', 'The tool call was cancelled.');
    }
    void runtime.queryClient.invalidateQueries({ queryKey: ['orders'] });
    return readSession();
  } catch (error) {
    return readError(error);
  }
}

export async function signOut(signal: AbortSignal) {
  const stop = cancelled(signal);
  if (stop) return stop;
  if (!useAuthStore.getState().isAuthenticated) {
    return { ok: true as const, signedIn: false };
  }

  await useAuthStore.getState().logout(signal);
  return { ok: true as const, signedIn: false };
}

export async function createAccount(input: unknown, signal: AbortSignal, runtime: AgentRuntime) {
  const stop = cancelled(signal);
  if (stop) return stop;
  if (useAuthStore.getState().isAuthenticated) {
    return toolError('ALREADY_SIGNED_IN', 'Sign out before creating another account.');
  }

  const parsed = signupSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return toolError('VALIDATION', parsed.error.issues.map((issue) => issue.message).join('; '));
  }

  try {
    await useAuthStore.getState().signup(parsed.data, signal);
    if (signal.aborted) {
      return toolError('CANCELLED', 'The tool call was cancelled.');
    }
    void runtime.queryClient.invalidateQueries({ queryKey: ['orders'] });
    return readSession();
  } catch (error) {
    return readError(error);
  }
}
