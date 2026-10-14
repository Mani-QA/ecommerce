import { pageCount, pageRange } from '@/components/admin/inventory';
import Button from '@/components/ui/Button';

interface ProductPaginationProps {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function ProductPagination({ page, total, onPageChange }: ProductPaginationProps) {
  const pages = pageCount(total);
  if (pages <= 1) {
    return (
      <p className="px-6 py-4 text-sm text-slate-600" data-testid="admin-product-count">
        {pageRange(page, total)}
      </p>
    );
  }

  return (
    <nav className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Product pages">
      <p className="text-sm text-slate-600" data-testid="admin-product-count">
        {pageRange(page, total)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          data-testid="admin-products-prev"
        >
          Previous
        </Button>
        <span className="text-sm text-slate-700" data-testid="admin-product-page">
          Page {page} of {pages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          data-testid="admin-products-next"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
