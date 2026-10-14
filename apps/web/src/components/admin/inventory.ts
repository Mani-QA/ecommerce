import {
  ADMIN_PRODUCT_PAGE_SIZE,
  BULK_DELETE_MATCH_LIMIT,
  type AdminProductQuery,
} from '@qademo/shared';

export type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: 'Date added (newest)' },
  { value: 'oldest', label: 'Date added (oldest)' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
];

const SORT_QUERY: Record<SortOption, Pick<AdminProductQuery, 'sort' | 'direction'>> = {
  newest: { sort: 'createdAt', direction: 'desc' },
  oldest: { sort: 'createdAt', direction: 'asc' },
  'name-asc': { sort: 'name', direction: 'asc' },
  'name-desc': { sort: 'name', direction: 'desc' },
};

export interface InventoryFilterState {
  name: string;
  from: string;
  to: string;
  sort: SortOption;
  page: number;
}

export function dateRangeError(from: string, to: string): string {
  if (from && to && from > to) {
    return 'Start date must be on or before the end date.';
  }
  return '';
}

export function toProductQuery(filters: InventoryFilterState): Partial<AdminProductQuery> {
  const sort = SORT_QUERY[filters.sort];
  return {
    name: filters.name || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    sort: sort.sort,
    direction: sort.direction,
    page: filters.page,
  };
}

export function hasProductFilter(filters: InventoryFilterState): boolean {
  return Boolean(filters.name || filters.from || filters.to);
}

export function describeProductFilter(filters: InventoryFilterState): string {
  const parts: string[] = [];
  if (filters.name) {
    parts.push(`name contains “${filters.name}”`);
  }
  if (filters.from && filters.to) {
    parts.push(`added from ${filters.from} to ${filters.to}`);
  } else if (filters.from) {
    parts.push(`added on or after ${filters.from}`);
  } else if (filters.to) {
    parts.push(`added on or before ${filters.to}`);
  }
  return parts.join(' and ');
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / ADMIN_PRODUCT_PAGE_SIZE));
}

export function pageRange(page: number, total: number): string {
  if (total === 0) {
    return 'No products';
  }
  const start = (page - 1) * ADMIN_PRODUCT_PAGE_SIZE + 1;
  const end = Math.min(page * ADMIN_PRODUCT_PAGE_SIZE, total);
  return `Showing ${start}–${end} of ${total}`;
}

export function selectedDeleteCopy(count: number): { title: string; description: string; confirmLabel: string } {
  const noun = count === 1 ? 'product' : 'products';
  return {
    title: `Delete ${count} selected ${noun}?`,
    description:
      'Products that belong to an existing order will be deactivated so order history stays intact. Every other selected product will be permanently deleted, including its stored image.',
    confirmLabel: `Delete ${count}`,
  };
}

export function matchingDeleteCopy(
  count: number,
  summary: string
): { title: string; description: string; confirmLabel: string } {
  const limited = count > BULK_DELETE_MATCH_LIMIT;
  const batch = Math.min(count, BULK_DELETE_MATCH_LIMIT);
  const scope = limited
    ? `This removes the first ${BULK_DELETE_MATCH_LIMIT.toLocaleString()} of ${count.toLocaleString()} products matching ${summary}. Run delete again to continue.`
    : `This removes all ${count} products matching ${summary}.`;

  return {
    title: `Delete ${batch.toLocaleString()} matching products?`,
    description: `${scope} Products that belong to an existing order will be deactivated so order history stays intact. Every other match will be permanently deleted, including its stored image.`,
    confirmLabel: `Delete ${batch.toLocaleString()}`,
  };
}
