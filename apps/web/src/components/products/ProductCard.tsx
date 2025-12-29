import { Link } from 'react-router-dom';
import { ShoppingCart, Check } from 'lucide-react';
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
  const { addItem, removeItem, isInCart } = useCartStore();
  const inCart = isInCart(product.id);

  const handleCartAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inCart) {
      removeItem(product.id);
    } else {
      addItem(product);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="group"
    >
      <Link to={`/products/${product.slug}`}>
        <div className="card overflow-hidden">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-slate-100">
            <img
              src={getImageUrl(product.imageUrl)}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {product.stock < 10 && product.stock > 0 && (
              <span className="absolute top-3 left-3 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-lg">
                Low Stock
              </span>
            )}
            {product.stock === 0 && (
              <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-lg">
                Out of Stock
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
              {product.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500 line-clamp-2">{product.description}</p>
            
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xl font-bold text-slate-900">
                {formatPrice(product.price)}
              </span>
              <Button
                variant={inCart ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleCartAction}
                disabled={product.stock === 0}
              >
                {inCart ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    In Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

