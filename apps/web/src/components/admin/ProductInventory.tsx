import { Plus, Trash2 } from 'lucide-react';
import type { Product } from '@qademo/shared';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import BulkDeleteDialog from '@/components/admin/BulkDeleteDialog';
import ProductFilters from '@/components/admin/ProductFilters';
import ProductInventoryTable from '@/components/admin/ProductInventoryTable';
import ProductPagination from '@/components/admin/ProductPagination';
import { useProductInventory } from '@/components/admin/useProductInventory';

interface ProductInventoryProps {
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onStockUpdate: (productId: number, stock: number) => void;
}

export default function ProductInventory({
  onAddProduct,
  onEditProduct,
  onStockUpdate,
}: ProductInventoryProps) {
  const inventory = useProductInventory();

  return (
    <Card>
      <InventoryHeader
        canDeleteMatching={inventory.canDeleteMatching}
        total={inventory.total}
        onDeleteMatching={inventory.requestMatchingDelete}
        onAddProduct={onAddProduct}
      />
      <ProductFilters
        nameInput={inventory.nameInput}
        fromDate={inventory.filters.from}
        toDate={inventory.filters.to}
        sort={inventory.filters.sort}
        dateError={inventory.dateError}
        onNameChange={inventory.setNameInput}
        onFromChange={inventory.setFrom}
        onToChange={inventory.setTo}
        onSortChange={inventory.setSort}
        onClear={inventory.clearFilters}
      />
      <InventoryNotices
        statusMessage={inventory.statusMessage}
        errorMessage={inventory.errorMessage || inventory.loadError}
        onRetry={inventory.loadError ? inventory.reload : undefined}
      />
      <CardContent className="p-0">
        <InventoryBody
          inventory={inventory}
          onEditProduct={onEditProduct}
          onStockUpdate={onStockUpdate}
        />
      </CardContent>
      <InventoryDeleteDialog inventory={inventory} />
    </Card>
  );
}

function InventoryDeleteDialog({ inventory }: { inventory: ReturnType<typeof useProductInventory> }) {
  return (
    <BulkDeleteDialog
      isOpen={Boolean(inventory.dialog)}
      title={inventory.dialog?.title ?? ''}
      description={inventory.dialog?.description ?? ''}
      confirmLabel={inventory.dialog?.confirmLabel ?? 'Delete'}
      isLoading={inventory.isDeleting}
      onCancel={inventory.cancelDelete}
      onConfirm={inventory.confirmDelete}
    />
  );
}

function InventoryHeader({
  canDeleteMatching,
  total,
  onDeleteMatching,
  onAddProduct,
}: {
  canDeleteMatching: boolean;
  total: number;
  onDeleteMatching: () => void;
  onAddProduct: () => void;
}) {
  return (
    <CardHeader>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-900">Inventory Management</h2>
        <div className="flex flex-wrap gap-2">
          {canDeleteMatching && (
            <Button variant="danger" size="sm" onClick={onDeleteMatching} data-testid="admin-product-delete-matching">
              <Trash2 className="w-4 h-4 mr-1" aria-hidden="true" />
              Delete {total} matching
            </Button>
          )}
          <Button onClick={onAddProduct} size="sm" data-testid="admin-add-product">
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
            Add Product
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}

function InventoryNotices({
  statusMessage,
  errorMessage,
  onRetry,
}: {
  statusMessage: string;
  errorMessage: string;
  onRetry?: () => void;
}) {
  return (
    <>
      {statusMessage && (
        <p className="mx-6 mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800" role="status" data-testid="admin-bulk-delete-message">
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <div className="mx-6 mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-4 py-3" role="alert" data-testid="admin-products-error">
          <p className="text-sm text-red-700">{errorMessage}</p>
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry} data-testid="admin-products-retry">
              Try again
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function InventoryBody({
  inventory,
  onEditProduct,
  onStockUpdate,
}: {
  inventory: ReturnType<typeof useProductInventory>;
  onEditProduct: (product: Product) => void;
  onStockUpdate: (productId: number, stock: number) => void;
}) {
  if (inventory.dateError) {
    return null;
  }

  if (inventory.isLoading) {
    return <LoadingSpinner data-testid="admin-products-loading" />;
  }

  if (inventory.products.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-slate-600" data-testid="admin-products-empty">
        No products match these filters.
      </p>
    );
  }

  return (
    <div aria-busy={inventory.isFetching}>
      <SelectionBar
        count={inventory.selectedCount}
        onDelete={inventory.requestSelectedDelete}
        onClear={inventory.clearSelection}
      />
      <ProductInventoryTable
        products={inventory.products}
        selectedIds={inventory.selectedIds}
        onToggleAll={inventory.togglePage}
        onToggleOne={inventory.toggleOne}
        onEdit={onEditProduct}
        onStockUpdate={onStockUpdate}
      />
      <ProductPagination page={inventory.filters.page} total={inventory.total} onPageChange={inventory.setPage} />
    </div>
  );
}

function SelectionBar({
  count,
  onDelete,
  onClear,
}: {
  count: number;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-brand-50 px-6 py-3">
      <p className="text-sm font-medium text-slate-800" data-testid="admin-product-selected-count">
        {count} selected
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClear} data-testid="admin-product-clear-selection">
          Clear selection
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete} data-testid="admin-product-delete-selected">
          Delete selected
        </Button>
      </div>
    </div>
  );
}
