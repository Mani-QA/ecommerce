import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Check, Package, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProduct } from '@/hooks/useProducts';
import { useCartStore } from '@/stores/cartStore';
import { formatPrice } from '@qademo/shared';
import { getImageUrl } from '@/lib/api';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, error } = useProduct(slug || '');
  const { addItem, removeItem, isInCart, getItem } = useCartStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Product Not Found</h1>
        <p className="mt-2 text-slate-600">The product you're looking for doesn't exist.</p>
        <Link to="/catalog" className="mt-6 inline-block">
          <Button variant="primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Button>
        </Link>
      </div>
    );
  }

  const inCart = isInCart(product.id);
  const cartItem = getItem(product.id);

  const handleCartAction = () => {
    if (inCart) {
      removeItem(product.id);
    } else {
      addItem(product);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Link
          to="/catalog"
          className="inline-flex items-center text-sm text-slate-600 hover:text-brand-600 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Catalog
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100"
          >
            <img
              src={getImageUrl(product.imageUrl)}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.stock < 10 && product.stock > 0 && (
              <Badge variant="warning" className="absolute top-4 left-4">
                Only {product.stock} left
              </Badge>
            )}
            {product.stock === 0 && (
              <Badge variant="error" className="absolute top-4 left-4">
                Out of Stock
              </Badge>
            )}
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">{product.name}</h1>
            
            <div className="mt-4 flex items-center gap-4">
              <span className="text-3xl font-bold text-brand-600">
                {formatPrice(product.price)}
              </span>
              <Badge variant={product.stock > 0 ? 'success' : 'error'}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
              </Badge>
            </div>

            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              {product.description}
            </p>

            {/* Features */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Package className="w-5 h-5 text-brand-500" />
                <span>Free packaging and handling</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Truck className="w-5 h-5 text-brand-500" />
                <span>Fast shipping available</span>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="mt-10 space-y-4">
              <Button
                size="lg"
                variant={inCart ? 'secondary' : 'primary'}
                onClick={handleCartAction}
                disabled={product.stock === 0}
                className="w-full"
              >
                {inCart ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    In Cart ({cartItem?.quantity})
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>

              {inCart && (
                <Link to="/cart" className="block">
                  <Button variant="ghost" className="w-full">
                    View Cart
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

