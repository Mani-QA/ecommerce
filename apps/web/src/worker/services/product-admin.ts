import {
  ADMIN_PRODUCT_PAGE_SIZE,
  BULK_DELETE_MATCH_LIMIT,
  type AdminProductQuery,
  type BulkDeleteProductsInput,
  type BulkDeleteProductsResult,
  type Product,
} from '@qademo/shared';
import type { ProductRow } from '../types/bindings';
import { productRowToProduct } from '../types/bindings';

const SQL_PARAM_LIMIT = 80;
const SORT_COLUMNS = {
  createdAt: 'created_at',
  name: 'name COLLATE NOCASE',
} as const;

interface ProductDeleteRow {
  id: number;
  image_key: string | null;
}

interface ProductFilter {
  name?: string;
  from?: string;
  to?: string;
}

interface SqlFilter {
  where: string;
  binds: string[];
}

export function buildProductFilter(filter: ProductFilter): SqlFilter {
  const conditions: string[] = [];
  const binds: string[] = [];

  if (filter.name) {
    conditions.push(`name LIKE ? ESCAPE '\\'`);
    binds.push(`%${escapeLike(filter.name)}%`);
  }

  if (filter.from) {
    conditions.push('date(created_at) >= date(?)');
    binds.push(filter.from);
  }

  if (filter.to) {
    conditions.push('date(created_at) <= date(?)');
    binds.push(filter.to);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    binds,
  };
}

export function buildAdminProductListSql(query: AdminProductQuery): {
  sql: string;
  binds: Array<string | number>;
} {
  const { where, binds } = buildProductFilter(query);
  const column = SORT_COLUMNS[query.sort] ?? SORT_COLUMNS.createdAt;
  const direction = query.direction === 'asc' ? 'ASC' : 'DESC';
  const offset = (query.page - 1) * ADMIN_PRODUCT_PAGE_SIZE;

  return {
    sql: `SELECT * FROM products ${where} ORDER BY ${column} ${direction}, id ${direction} LIMIT ? OFFSET ?`,
    binds: [...binds, ADMIN_PRODUCT_PAGE_SIZE, offset],
  };
}

export async function listAdminProducts(
  db: D1Database,
  query: AdminProductQuery
): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
  const filter = { name: query.name, from: query.from, to: query.to };
  const total = await countProducts(db, filter);
  const { sql, binds } = buildAdminProductListSql(query);
  const { results } = await bindStatement(db.prepare(sql), binds).all<ProductRow>();

  return {
    products: results.map(toAdminProduct),
    total,
    page: query.page,
    limit: ADMIN_PRODUCT_PAGE_SIZE,
  };
}

export async function removeProductsInBulk(
  db: D1Database,
  bucket: R2Bucket,
  input: BulkDeleteProductsInput
): Promise<BulkDeleteProductsResult> {
  if (input.ids?.length) {
    return deleteByIds(db, bucket, input.ids);
  }

  if (!input.match) {
    return emptyDeleteResult(0);
  }

  return deleteByMatch(db, bucket, input.match);
}

function toAdminProduct(row: ProductRow): Product {
  const product = productRowToProduct(row);
  if (product.imageKey) {
    product.imageUrl = `/api/images/${product.imageKey}`;
  }
  return product;
}

function bindStatement(statement: D1PreparedStatement, binds: Array<string | number>): D1PreparedStatement {
  return binds.length > 0 ? statement.bind(...binds) : statement;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

async function countProducts(db: D1Database, filter: ProductFilter): Promise<number> {
  const { where, binds } = buildProductFilter(filter);
  const row = await bindStatement(
    db.prepare(`SELECT COUNT(*) as count FROM products ${where}`),
    binds
  ).first<{ count: number }>();

  return Number(row?.count ?? 0);
}

async function deleteByIds(
  db: D1Database,
  bucket: R2Bucket,
  ids: number[]
): Promise<BulkDeleteProductsResult> {
  const uniqueIds = [...new Set(ids)];
  const existing = await selectProductsByIds(db, uniqueIds);
  const outcome = await deleteProductRows(db, bucket, existing);

  return {
    requested: uniqueIds.length,
    deleted: outcome.deleted,
    deactivated: outcome.deactivated,
    notFound: uniqueIds.length - existing.length,
    hasMore: false,
  };
}

async function deleteByMatch(
  db: D1Database,
  bucket: R2Bucket,
  match: ProductFilter
): Promise<BulkDeleteProductsResult> {
  const total = await countProducts(db, match);
  const rows = await selectMatchingProducts(db, match, BULK_DELETE_MATCH_LIMIT);
  const outcome = await deleteProductRows(db, bucket, rows);

  return {
    requested: rows.length,
    deleted: outcome.deleted,
    deactivated: outcome.deactivated,
    notFound: 0,
    hasMore: total > rows.length,
  };
}

async function selectProductsByIds(db: D1Database, ids: number[]): Promise<ProductDeleteRow[]> {
  const rows: ProductDeleteRow[] = [];

  for (const group of chunk(ids, SQL_PARAM_LIMIT)) {
    const { results } = await db
      .prepare(
        `SELECT id, image_key FROM products WHERE id IN (${placeholders(group.length)})`
      )
      .bind(...group)
      .all<ProductDeleteRow>();
    rows.push(...results);
  }

  return rows;
}

async function selectMatchingProducts(
  db: D1Database,
  filter: ProductFilter,
  limit: number
): Promise<ProductDeleteRow[]> {
  const { where, binds } = buildProductFilter(filter);
  const { results } = await bindStatement(
    db.prepare(`SELECT id, image_key FROM products ${where} ORDER BY id LIMIT ?`),
    [...binds, limit]
  ).all<ProductDeleteRow>();

  return results;
}

async function selectOrderedProductIds(db: D1Database, ids: number[]): Promise<Set<number>> {
  const referenced = new Set<number>();

  for (const group of chunk(ids, SQL_PARAM_LIMIT)) {
    const { results } = await db
      .prepare(
        `SELECT DISTINCT product_id FROM order_items WHERE product_id IN (${placeholders(group.length)})`
      )
      .bind(...group)
      .all<{ product_id: number }>();

    for (const row of results) {
      referenced.add(row.product_id);
    }
  }

  return referenced;
}

async function deleteProductRows(
  db: D1Database,
  bucket: R2Bucket,
  rows: ProductDeleteRow[]
): Promise<{ deleted: number; deactivated: number }> {
  if (rows.length === 0) {
    return { deleted: 0, deactivated: 0 };
  }

  const referenced = await selectOrderedProductIds(
    db,
    rows.map((row) => row.id)
  );
  const removable = rows.filter((row) => !referenced.has(row.id));
  const kept = rows.filter((row) => referenced.has(row.id));

  await deleteProducts(db, removable.map((row) => row.id));
  await deactivateProducts(db, kept.map((row) => row.id));
  await removeProductImages(
    bucket,
    removable.flatMap((row) => (row.image_key ? [row.image_key] : []))
  );

  return { deleted: removable.length, deactivated: kept.length };
}

async function deleteProducts(db: D1Database, ids: number[]): Promise<void> {
  for (const group of chunk(ids, SQL_PARAM_LIMIT)) {
    await db
      .prepare(`DELETE FROM products WHERE id IN (${placeholders(group.length)})`)
      .bind(...group)
      .run();
  }
}

async function deactivateProducts(db: D1Database, ids: number[]): Promise<void> {
  for (const group of chunk(ids, SQL_PARAM_LIMIT)) {
    await db
      .prepare(
        `UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id IN (${placeholders(group.length)})`
      )
      .bind(...group)
      .run();
  }
}

async function removeProductImages(bucket: R2Bucket, keys: string[]): Promise<void> {
  for (const group of chunk([...new Set(keys)], SQL_PARAM_LIMIT)) {
    try {
      await Promise.all(group.map((key) => bucket.delete(key)));
    } catch (error) {
      console.error('Failed to delete product images from storage', error);
    }
  }
}

function emptyDeleteResult(requested: number): BulkDeleteProductsResult {
  return {
    requested,
    deleted: 0,
    deactivated: 0,
    notFound: 0,
    hasMore: false,
  };
}
