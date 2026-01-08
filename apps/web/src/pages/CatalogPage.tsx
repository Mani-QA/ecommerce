import { motion } from 'framer-motion';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/products/ProductCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function CatalogPage() {
  const { data: products, isLoading, error } = useProducts();

  if (isLoading) {
    return <LoadingSpinner data-testid="catalog-loading" />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center" data-testid="catalog-error">
        <p className="text-red-600" role="alert" aria-live="polite">Failed to load products. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12" data-testid="catalog-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-bold text-slate-900" data-testid="catalog-heading">Product Catalog</h1>
          <p className="mt-2 text-lg text-slate-600" data-testid="catalog-product-count">
            Browse our complete selection of {products?.length || 0} products
          </p>
        </motion.div>

        {/* Product Grid */}
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
          data-testid="product-grid"
          role="list"
          aria-label="Product catalog"
        >
          {products?.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>

        {/* Empty State */}
        {products?.length === 0 && (
          <div className="text-center py-16" data-testid="catalog-empty-state">
            <p className="text-slate-500 text-lg">No products available.</p>
          </div>
        )}
      </div>
    </div>
  );
}

