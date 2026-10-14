import type { ZodError, ZodType } from 'zod';

export interface ToolFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export function toolError(code: string, message: string): ToolFailure {
  return { ok: false, error: { code, message } };
}

export function isToolFailure(value: object): value is ToolFailure {
  return 'ok' in value && value.ok === false && 'error' in value;
}

export function cancelled(signal: AbortSignal): ToolFailure | null {
  if (!signal.aborted) {
    return null;
  }
  return toolError('CANCELLED', 'The tool call was cancelled.');
}

export function parseInput<T>(schema: ZodType<T>, input: unknown): { data: T } | ToolFailure {
  const parsed = schema.safeParse(input ?? {});
  if (!parsed.success) {
    return toolError('VALIDATION', formatZod(parsed.error));
  }
  return { data: parsed.data };
}

export function readError(error: unknown): ToolFailure {
  if (isAbortError(error)) {
    return toolError('CANCELLED', 'The tool call was cancelled.');
  }
  if (error instanceof Error) {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : 'REQUEST_FAILED';
    return toolError(code, error.message);
  }
  return toolError('REQUEST_FAILED', 'The request failed.');
}

function formatZod(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
