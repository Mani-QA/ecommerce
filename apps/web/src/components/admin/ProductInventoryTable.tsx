import { useEffect, useRef } from 'react';
import { formatDateTime, formatPrice, type Product } from '@qademo/shared';
import { getImageUrl } from '@/lib/api';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface ProductInventoryTableProps {
  products: Product[];
  selectedIds: Set<number>;
  onToggleAll: () => void;
  onToggleOne: (productId: number) => void;
  onEdit: (product: Product) => void;
  onStockUpdate: (productId: number, stock: number) => void;
}

export default function ProductInventoryTable({
  products,
  selectedIds,
  onToggleAll,
  onToggleOne,
  onEdit,
  onStockUpdate,
}: ProductInventoryTableProps) {
  const pageIds = products.map((product) => product.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = pageIds.some((id) => selectedIds.has(id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-testid="admin-product-table">
        <caption className="sr-only">Product inventory</caption>
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left" scope="col">
              <SelectAllCheckbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={onToggleAll}
                disabled={products.length === 0}
              />
            </th>
            {['Product', 'Added', 'Price', 'Stock', 'Status'].map((label) => (
              <ColumnHeading key={label} label={label} />
            ))}
            <ColumnHeading label="Actions" align="right" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              selected={selectedIds.has(product.id)}
              onToggle={onToggleOne}
              onEdit={onEdit}
              onStockUpdate={onStockUpdate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ColumnHeading({ label, align = 'left' }: { label: string; align?: 'left' | 'right' }) {
  const alignment = align === 'right' ? 'text-right' : 'text-left';
  return (
    <th className={`px-6 py-3 ${alignment} text-xs font-medium text-slate-500 uppercase tracking-wider`} scope="col">
      {label}
    </th>
  );
}

function SelectAllCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label="Select all products on this page"
      data-testid="admin-product-select-all"
      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
    />
  );
}

function ProductRow({
  product,
  selected,
  onToggle,
  onEdit,
  onStockUpdate,
}: {
  product: Product;
  selected: boolean;
  onToggle: (productId: number) => void;
  onEdit: (product: Product) => void;
  onStockUpdate: (productId: number, stock: number) => void;
}) {
  return (
    <tr
      className={selected ? 'bg-brand-50' : 'hover:bg-slate-50'}
      data-testid={`admin-product-row-${product.id}`}
    >
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(product.id)}
          aria-label={`Select ${product.name}`}
          data-testid={`admin-product-select-${product.id}`}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
      </td>
      <td className="px-6 py-4">
        <ProductIdentity product={product} />
      </td>
      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{formatDateTime(product.createdAt)}</td>
      <td className="px-6 py-4 text-slate-900">{formatPrice(product.price)}</td>
      <td className="px-6 py-4">
        <StockField product={product} onStockUpdate={onStockUpdate} />
      </td>
      <td className="px-6 py-4">
        <Badge variant={product.isActive ? 'success' : 'error'}>
          {product.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="px-6 py-4 text-right">
        <Button variant="ghost" size="sm" onClick={() => onEdit(product)} data-testid={`admin-product-edit-${product.id}`}>
          Edit
        </Button>
      </td>
    </tr>
  );
}

function ProductIdentity({ product }: { product: Product }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={getImageUrl(product.imageUrl)}
        alt={product.name}
        className="w-10 h-10 rounded-lg object-cover"
      />
      <span className="font-medium text-slate-900">{product.name}</span>
    </div>
  );
}

function StockField({
  product,
  onStockUpdate,
}: {
  product: Product;
  onStockUpdate: (productId: number, stock: number) => void;
}) {
  return (
    <input
      type="number"
      defaultValue={product.stock}
      min="0"
      aria-label={`Stock for ${product.name}`}
      data-testid={`admin-product-stock-${product.id}`}
      className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      onBlur={(event) => {
        const newStock = parseInt(event.target.value, 10);
        if (!isNaN(newStock) && newStock !== product.stock && newStock >= 0) {
          onStockUpdate(product.id, newStock);
        }
      }}
    />
  );
}
