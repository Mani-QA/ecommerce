import type { BulkDeleteProductsResult } from '@qademo/shared';

export function formatBulkDeleteSummary(result: BulkDeleteProductsResult): string {
  const sentences = [
    `Permanently deleted ${result.deleted} ${plural(result.deleted, 'product')}.`,
  ];

  if (result.deactivated > 0) {
    const verb = result.deactivated === 1 ? 'was' : 'were';
    const pronoun = result.deactivated === 1 ? 'it belongs' : 'they belong';
    sentences.push(
      `${result.deactivated} ${plural(result.deactivated, 'product')} ${verb} deactivated because ${pronoun} to an order.`
    );
  }

  if (result.notFound > 0) {
    sentences.push(
      `${result.notFound} selected ${plural(result.notFound, 'product')} ${
        result.notFound === 1 ? 'was' : 'were'
      } already removed.`
    );
  }

  if (result.hasMore) {
    sentences.push('More products still match this filter. Run delete again to continue.');
  }

  return sentences.join(' ');
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}
