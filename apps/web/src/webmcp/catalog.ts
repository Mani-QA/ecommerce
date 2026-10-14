import type { Product } from '@qademo/shared';
import { z } from 'zod';
import { api } from '@/lib/api';
import { presentProduct } from './present';
import { cancelled, isToolFailure, parseInput, readError, toolError } from './result';
import type { AgentRuntime } from './runtime';

const RESULT_LIMIT = 24;

const searchInput = z.object({
  query: z.string().trim().max(200).optional(),
  maxPrice: z.number().nonnegative().optional(),
  inStockOnly: z.boolean().optional(),
});

const lookupInput = z
  .object({
    productId: z.number().int().positive().optional(),
    slug: z.string().trim().min(1).max(200).optional(),
    name: z.string().trim().min(1).max(200).optional(),
  })
  .superRefine((value, context) => {
    const identifiers = [value.productId, value.slug, value.name].filter((item) => item !== undefined);
    if (identifiers.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide exactly one of productId, slug, or name.',
      });
    }
  });

export type ProductLookup = z.infer<typeof lookupInput>;
export type ProductSearch = z.infer<typeof searchInput>;

export function filterProducts(products: Product[], input: ProductSearch): Product[] {
  const query = input.query?.toLowerCase() ?? '';
  return products.filter((product) => {
    const matchesQuery = query.length === 0 || matchesText(product, query);
    const matchesPrice = input.maxPrice === undefined || product.price <= input.maxPrice;
    const matchesStock = input.inStockOnly !== true || product.stock > 0;
    return matchesQuery && matchesPrice && matchesStock;
  });
}

export async function searchProducts(input: unknown, signal: AbortSignal, runtime: AgentRuntime) {
  const stop = cancelled(signal);
  if (stop) return stop;

  const parsed = parseInput(searchInput, input);
  if (isToolFailure(parsed)) return parsed;

  try {
    const products = await api.getProducts(signal);
    if (signal.aborted) {
      return toolError('CANCELLED', 'The tool call was cancelled.');
    }
    const matches = filterProducts(products, parsed.data);
    runtime.queryClient.setQueryData(['products'], products);
    return {
      ok: true as const,
      totalMatches: matches.length,
      returned: Math.min(matches.length, RESULT_LIMIT),
      products: matches.slice(0, RESULT_LIMIT).map(presentProduct),
    };
  } catch (error) {
    return readError(error);
  }
}

export async function getProduct(input: unknown, signal: AbortSignal) {
  const stop = cancelled(signal);
  if (stop) return stop;

  const parsed = parseInput(lookupInput, input);
  if (isToolFailure(parsed)) return parsed;

  try {
    const product = await resolveProduct(parsed.data, signal);
    if (isToolFailure(product)) return product;
    return { ok: true as const, product: presentProduct(product) };
  } catch (error) {
    return readError(error);
  }
}

export async function resolveProduct(input: ProductLookup, signal: AbortSignal) {
  if (input.productId !== undefined) {
    return api.getProductById(input.productId, signal);
  }
  if (input.slug !== undefined) {
    return api.getProduct(input.slug, signal);
  }
  return findByName(input.name ?? '', signal);
}

function matchesText(product: Product, query: string): boolean {
  const description = product.description?.toLowerCase() ?? '';
  return (
    product.name.toLowerCase().includes(query) ||
    product.slug.toLowerCase().includes(query) ||
    description.includes(query)
  );
}

async function findByName(name: string, signal: AbortSignal) {
  const products = await api.getProducts(signal);
  const target = name.toLowerCase();
  const exact = products.filter((product) => product.name.toLowerCase() === target);
  const matches = exact.length > 0 ? exact : products.filter((product) => product.name.toLowerCase().includes(target));

  if (matches.length === 1) {
    return matches[0];
  }
  if (matches.length === 0) {
    return toolError('NOT_FOUND', `No product is named "${name}". Use search_products to see the catalog.`);
  }

  const choices = matches
    .slice(0, 8)
    .map((product) => `${product.name} (id ${product.id}, slug ${product.slug})`)
    .join('; ');
  return toolError('AMBIGUOUS', `Several products match "${name}". Choose one: ${choices}.`);
}
