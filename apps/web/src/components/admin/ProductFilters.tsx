import type { ReactNode } from 'react';
import type { SortOption } from '@/components/admin/inventory';
import { SORT_OPTIONS } from '@/components/admin/inventory';
import Button from '@/components/ui/Button';

interface ProductFiltersProps {
  nameInput: string;
  fromDate: string;
  toDate: string;
  sort: SortOption;
  dateError: string;
  onNameChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onSortChange: (value: SortOption) => void;
  onClear: () => void;
}

export default function ProductFilters({
  nameInput,
  fromDate,
  toDate,
  sort,
  dateError,
  onNameChange,
  onFromChange,
  onToChange,
  onSortChange,
  onClear,
}: ProductFiltersProps) {
  return (
    <div className="px-6 py-4 border-b border-slate-100 space-y-4">
      <p className="text-sm text-slate-600" id="product-filter-hint">
        Filter by product name or the date it was added (UTC), then select a batch to delete.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <NameFilter value={nameInput} onChange={onNameChange} />
        <DateFilter id="admin-product-from" label="Added from" value={fromDate} max={toDate} testId="admin-product-date-from" onChange={onFromChange} />
        <DateFilter id="admin-product-to" label="Added to" value={toDate} min={fromDate} testId="admin-product-date-to" onChange={onToChange} />
        <SortFilter value={sort} onChange={onSortChange} />
      </div>
      {dateError && (
        <p className="text-sm text-red-600" role="alert" data-testid="admin-product-date-error">
          {dateError}
        </p>
      )}
      <div>
        <Button variant="ghost" size="sm" onClick={onClear} data-testid="admin-product-clear-filters">
          Clear filters
        </Button>
      </div>
    </div>
  );
}

const fieldClass =
  'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';

function NameFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <FilterField id="admin-product-name" label="Name">
      <input
        id="admin-product-name"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name"
        autoComplete="off"
        aria-describedby="product-filter-hint"
        data-testid="admin-product-search"
        className={fieldClass}
      />
    </FilterField>
  );
}

function DateFilter({
  id,
  label,
  value,
  min,
  max,
  testId,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min?: string;
  max?: string;
  testId: string;
  onChange: (value: string) => void;
}) {
  return (
    <FilterField id={id} label={label}>
      <input
        id={id}
        type="date"
        value={value}
        min={min || undefined}
        max={max || undefined}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
        className={fieldClass}
      />
    </FilterField>
  );
}

function SortFilter({ value, onChange }: { value: SortOption; onChange: (value: SortOption) => void }) {
  return (
    <FilterField id="admin-product-sort" label="Sort by">
      <select
        id="admin-product-sort"
        value={value}
        onChange={(event) => onChange(event.target.value as SortOption)}
        data-testid="admin-product-sort"
        className={fieldClass}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

function FilterField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
