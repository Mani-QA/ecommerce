import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { BulkDeleteProductsInput } from '@qademo/shared';
import { useAdminProducts, useBulkDeleteProducts } from '@/hooks/useAdmin';
import { formatBulkDeleteSummary } from '@/lib/bulk-delete-summary';
import {
  dateRangeError,
  describeProductFilter,
  hasProductFilter,
  matchingDeleteCopy,
  pageCount,
  selectedDeleteCopy,
  toProductQuery,
  type InventoryFilterState,
  type SortOption,
} from '@/components/admin/inventory';

const INITIAL_FILTERS: InventoryFilterState = {
  name: '',
  from: '',
  to: '',
  sort: 'newest',
  page: 1,
};

type PendingDelete = {
  kind: 'selected' | 'matching';
  input: BulkDeleteProductsInput;
  count: number;
};

export function useProductInventory() {
  const [nameInput, setNameInput] = useState('');
  const [filters, setFilters] = useState<InventoryFilterState>(INITIAL_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const dateError = dateRangeError(filters.from, filters.to);
  const catalog = useAdminProducts(toProductQuery(filters), !dateError);
  const bulkDelete = useBulkDeleteProducts();
  const products = catalog.data?.products ?? [];
  const total = catalog.data?.total ?? 0;

  useDebouncedFilterName(nameInput, setFilters);
  useClearSelectionOnFilterChange(filters, setSelectedIds);
  useClampPage(filters.page, total, dateError, catalog.isLoading, setFilters);

  return {
    nameInput,
    filters,
    dateError,
    products,
    total,
    selectedIds,
    selectedCount: selectedIds.size,
    canDeleteMatching: hasProductFilter(filters) && !dateError && total > 0 && !catalog.isFetching,
    statusMessage,
    errorMessage,
    isLoading: catalog.isLoading,
    isFetching: catalog.isFetching,
    loadError: catalog.isError ? errorText(catalog.error) : '',
    isDeleting: bulkDelete.isPending,
    dialog: pendingDelete ? dialogCopy(pendingDelete, filters) : null,
    reload: () => void catalog.refetch(),
    ...filterActions(setNameInput, setFilters),
    toggleOne: (productId: number) => toggleId(setSelectedIds, productId),
    togglePage: () => toggleVisible(setSelectedIds, products.map((product) => product.id)),
    clearSelection: () => setSelectedIds(new Set()),
    requestSelectedDelete: () => openSelectedDelete(selectedIds, setPendingDelete),
    requestMatchingDelete: () => openMatchingDelete(filters, dateError, total, setPendingDelete),
    cancelDelete: () => {
      if (!bulkDelete.isPending) setPendingDelete(null);
    },
    confirmDelete: () => confirmDelete(pendingDelete, bulkDelete, setPendingDelete, setSelectedIds, setStatusMessage, setErrorMessage),
  };
}

function filterActions(
  setNameInput: Dispatch<SetStateAction<string>>,
  setFilters: Dispatch<SetStateAction<InventoryFilterState>>
) {
  return {
    setNameInput,
    setFrom: (from: string) => setFilters((current) => ({ ...current, from, page: 1 })),
    setTo: (to: string) => setFilters((current) => ({ ...current, to, page: 1 })),
    setSort: (sort: SortOption) => setFilters((current) => ({ ...current, sort, page: 1 })),
    setPage: (page: number) => setFilters((current) => ({ ...current, page })),
    clearFilters: () => {
      setNameInput('');
      setFilters(INITIAL_FILTERS);
    },
  };
}

function confirmDelete(
  pending: PendingDelete | null,
  bulkDelete: ReturnType<typeof useBulkDeleteProducts>,
  setPendingDelete: (value: PendingDelete | null) => void,
  setSelectedIds: (value: Set<number>) => void,
  setStatusMessage: (value: string) => void,
  setErrorMessage: (value: string) => void
): void {
  void runDelete(pending, bulkDelete, setPendingDelete, setSelectedIds, setStatusMessage, setErrorMessage);
}

function useDebouncedFilterName(
  nameInput: string,
  setFilters: Dispatch<SetStateAction<InventoryFilterState>>
): void {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const name = nameInput.trim();
      setFilters((current) => (current.name === name ? current : { ...current, name, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [nameInput, setFilters]);
}

function useClampPage(
  page: number,
  total: number,
  dateError: string,
  isLoading: boolean,
  setFilters: Dispatch<SetStateAction<InventoryFilterState>>
): void {
  useEffect(() => {
    if (dateError || isLoading) return;
    const pages = pageCount(total);
    if (page > pages) {
      setFilters((current) => ({ ...current, page: pages }));
    }
  }, [page, total, dateError, isLoading, setFilters]);
}

function useClearSelectionOnFilterChange(
  filters: InventoryFilterState,
  setSelectedIds: Dispatch<SetStateAction<Set<number>>>
): void {
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters.name, filters.from, filters.to, filters.sort, setSelectedIds]);
}

function toggleId(setSelectedIds: Dispatch<SetStateAction<Set<number>>>, productId: number): void {
  setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    return next;
  });
}

function toggleVisible(setSelectedIds: Dispatch<SetStateAction<Set<number>>>, pageIds: number[]): void {
  setSelectedIds((current) => {
    const next = new Set(current);
    const allSelected = pageIds.every((id) => next.has(id));
    pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
    return next;
  });
}

function openSelectedDelete(
  selectedIds: Set<number>,
  setPendingDelete: (value: PendingDelete | null) => void
): void {
  const ids = [...selectedIds];
  if (ids.length > 0) {
    setPendingDelete({ kind: 'selected', count: ids.length, input: { ids } });
  }
}

function openMatchingDelete(
  filters: InventoryFilterState,
  dateError: string,
  total: number,
  setPendingDelete: (value: PendingDelete | null) => void
): void {
  if (!hasProductFilter(filters) || dateError || total === 0) return;
  setPendingDelete({
    kind: 'matching',
    count: total,
    input: {
      match: {
        name: filters.name || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      },
    },
  });
}

function dialogCopy(pending: PendingDelete, filters: InventoryFilterState) {
  return pending.kind === 'selected'
    ? selectedDeleteCopy(pending.count)
    : matchingDeleteCopy(pending.count, describeProductFilter(filters));
}

async function runDelete(
  pending: PendingDelete | null,
  bulkDelete: ReturnType<typeof useBulkDeleteProducts>,
  setPendingDelete: (value: PendingDelete | null) => void,
  setSelectedIds: (value: Set<number>) => void,
  setStatusMessage: (value: string) => void,
  setErrorMessage: (value: string) => void
): Promise<void> {
  if (!pending) return;

  try {
    const result = await bulkDelete.mutateAsync(pending.input);
    setStatusMessage(formatBulkDeleteSummary(result));
    setErrorMessage('');
    setSelectedIds(new Set());
    setPendingDelete(null);
  } catch (error) {
    setErrorMessage(errorText(error));
    setStatusMessage('');
    setPendingDelete(null);
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not update products';
}
