import { describe, expect, it } from 'vitest';
import { adminProductQuerySchema, bulkDeleteProductsSchema } from '@qademo/shared';
import { buildAdminProductListSql, buildProductFilter } from './product-admin';

describe('admin product filters', () => {
  it('escapes name wildcards and applies an inclusive created date range', () => {
    const filter = buildProductFilter({ name: '100%_off', from: '2026-10-01', to: '2026-10-14' });

    expect(filter.where).toBe(
      `WHERE name LIKE ? ESCAPE '\\' AND date(created_at) >= date(?) AND date(created_at) <= date(?)`
    );
    expect(filter.binds).toEqual(['%100\\%\\_off%', '2026-10-01', '2026-10-14']);
  });

  it('sorts by created date descending and pages with bound limit and offset', () => {
    const query = adminProductQuerySchema.parse({});
    const statement = buildAdminProductListSql(query);

    expect(statement.sql).toContain('ORDER BY created_at DESC, id DESC');
    expect(statement.binds).toEqual([100, 0]);
  });

  it('sorts by name ascending on later pages', () => {
    const query = adminProductQuerySchema.parse({ sort: 'name', direction: 'asc', page: '3' });
    const statement = buildAdminProductListSql(query);

    expect(statement.sql).toContain('ORDER BY name COLLATE NOCASE ASC, id ASC');
    expect(statement.binds).toEqual([100, 200]);
  });
});

describe('admin product query schema', () => {
  it('rejects an impossible date and a reversed range', () => {
    expect(adminProductQuerySchema.safeParse({ from: '2026-02-31' }).success).toBe(false);
    expect(adminProductQuerySchema.safeParse({ from: '2026-10-14', to: '2026-10-01' }).success).toBe(false);
  });

  it('defaults sort, direction, and page', () => {
    const parsed = adminProductQuerySchema.parse({ name: '  bot  ' });
    expect(parsed).toMatchObject({
      name: 'bot',
      sort: 'createdAt',
      direction: 'desc',
      page: 1,
    });
  });
});

describe('bulk delete schema', () => {
  it('requires a selection or a name or date filter', () => {
    expect(bulkDeleteProductsSchema.safeParse({}).success).toBe(false);
    expect(bulkDeleteProductsSchema.safeParse({ match: {} }).success).toBe(false);
    expect(bulkDeleteProductsSchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it('accepts selected ids or a created-date filter', () => {
    expect(bulkDeleteProductsSchema.safeParse({ ids: [4, 9] }).success).toBe(true);
    expect(
      bulkDeleteProductsSchema.safeParse({ match: { from: '2026-10-01', to: '2026-10-14' } }).success
    ).toBe(true);
  });

  it('rejects more than 500 ids', () => {
    const ids = Array.from({ length: 501 }, (_, index) => index + 1);
    expect(bulkDeleteProductsSchema.safeParse({ ids }).success).toBe(false);
  });
});
