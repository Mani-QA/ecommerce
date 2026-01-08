import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '@qademo/shared';
import { formatPrice } from '@qademo/shared';
import { useCartStore } from '@/stores/cartStore';
import { getImageUrl } from '@/lib/api';
import Button from '../ui/Button';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const navigate = useNavigate();
  const { addItem, removeItem, isInCart } = useCartStore();
  const inCart = isInCart(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  };

  const handleGoToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/cart');
  };

  const handleRemoveFromCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeItem(product.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="group"
      data-testid={`product-card-${product.id}`}
      role="listitem"
    >
      <Link to={`/products/${product.slug}`} data-testid={`product-link-${product.id}`} aria-label={`View ${product.name}`}>
        <div className="card overflow-hidden">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-slate-100">
            <img
              src={getImageUrl(product.imageUrl)}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              data-testid={`product-image-${product.id}`}
            />
            {product.stock < 10 && product.stock > 0 && (
              <span 
                className="absolute top-3 left-3 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-lg"
                data-testid={`product-low-stock-badge-${product.id}`}
                role="status"
                aria-label="Low stock"
              >
                Low Stock
              </span>
            )}
            {product.stock === 0 && (
              <span 
                className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-lg"
                data-testid={`product-out-of-stock-badge-${product.id}`}
                role="status"
                aria-label="Out of stock"
              >
                Out of Stock
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 
              className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1"
              data-testid={`product-name-${product.id}`}
            >
              {product.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500 line-clamp-2" data-testid={`product-description-${product.id}`}>{product.description}</p>
            
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xl font-bold text-slate-900" data-testid={`product-price-${product.id}`}>
                {formatPrice(product.price)}
              </span>
              {inCart ? (
                <div className="flex items-center gap-1" data-testid={`product-in-cart-actions-${product.id}`}>
                  <button
                    onClick={handleRemoveFromCart}
                    className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    title="Remove from cart"
                    data-testid={`product-remove-from-cart-${product.id}`}
                    aria-label={`Remove ${product.name} from cart`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGoToCart}
                    data-testid={`product-go-to-cart-${product.id}`}
                    aria-label="Go to cart"
                  >
                    <Check className="w-4 h-4 mr-1" aria-hidden="true" />
                    In Cart
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  data-testid={`product-add-to-cart-${product.id}`}
                  aria-label={`Add ${product.name} to cart`}
                >
                  <ShoppingCart className="w-4 h-4 mr-1" aria-hidden="true" />
                  Add
                </Button>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

