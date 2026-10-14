import { describe, expect, it } from 'vitest';
import { BULK_DELETE_MATCH_LIMIT } from '@qademo/shared';
import { formatBulkDeleteSummary } from '@/lib/bulk-delete-summary';
import { dateRangeError, matchingDeleteCopy } from '@/components/admin/inventory';

describe('bulk delete summary', () => {
  it('explains permanent deletes, order deactivation, and remaining matches', () => {
    const summary = formatBulkDeleteSummary({
      requested: 3,
      deleted: 2,
      deactivated: 1,
      notFound: 0,
      hasMore: true,
    });

    expect(summary).toContain('Permanently deleted 2 products.');
    expect(summary).toContain('1 product was deactivated because it belongs to an order.');
    expect(summary).toContain('Run delete again');
  });
});

describe('inventory date filters', () => {
  it('rejects a reversed date range', () => {
    expect(dateRangeError('2026-10-14', '2026-10-01')).toMatch(/on or before/);
    expect(dateRangeError('2026-10-01', '2026-10-14')).toBe('');
  });

  it('tells the admin when a matching delete is capped', () => {
    const copy = matchingDeleteCopy(BULK_DELETE_MATCH_LIMIT + 25, 'added on 2026-10-14');
    expect(copy.description).toContain('first 1,000');
    expect(copy.confirmLabel).toBe('Delete 1,000');
  });
});
