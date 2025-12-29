import { motion } from 'framer-motion';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/products/ProductCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function CatalogPage() {
  const { data: products, isLoading, error } = useProducts();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-red-600">Failed to load products. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-bold text-slate-900">Product Catalog</h1>
          <p className="mt-2 text-lg text-slate-600">
            Browse our complete selection of {products?.length || 0} products
          </p>
        </motion.div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products?.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>

        {/* Empty State */}
        {products?.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500 text-lg">No products available.</p>
          </div>
        )}
      </div>
    </div>
  );
}

