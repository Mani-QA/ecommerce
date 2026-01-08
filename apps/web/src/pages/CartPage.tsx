import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@qademo/shared';
import { getImageUrl } from '@/lib/api';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardFooter } from '@/components/ui/Card';

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalAmount, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-testid="cart-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
          data-testid="cart-empty-state"
        >
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-slate-400" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="cart-empty-heading">Your cart is empty</h1>
          <p className="mt-2 text-slate-600">Add some products to get started.</p>
          <Link to="/catalog" className="mt-6 inline-block">
            <Button data-testid="continue-shopping-button" aria-label="Continue shopping">
              Continue Shopping
              <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12" data-testid="cart-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900" data-testid="cart-heading">Shopping Cart</h1>
            <p className="mt-1 text-slate-600" data-testid="cart-item-count">{items.length} items in your cart</p>
          </div>
          <Button variant="ghost" onClick={clearCart} data-testid="clear-cart-button" aria-label="Clear cart">
            Clear Cart
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4" data-testid="cart-items-list" role="list" aria-label="Cart items">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  data-testid={`cart-item-${item.productId}`}
                  role="listitem"
                >
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex gap-4 sm:gap-6">
                        {/* Image */}
                        <Link
                          to={`/products/${item.product.slug}`}
                          className="flex-shrink-0"
                          data-testid={`cart-item-image-link-${item.productId}`}
                          aria-label={`View ${item.product.name}`}
                        >
                          <img
                            src={getImageUrl(item.product.imageUrl)}
                            alt={item.product.name}
                            className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl"
                            data-testid={`cart-item-image-${item.productId}`}
                          />
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/products/${item.product.slug}`}
                            className="font-semibold text-slate-900 hover:text-brand-600 line-clamp-1"
                            data-testid={`cart-item-name-${item.productId}`}
                          >
                            {item.product.name}
                          </Link>
                          <p className="mt-1 text-sm text-slate-500 line-clamp-2" data-testid={`cart-item-description-${item.productId}`}>
                            {item.product.description}
                          </p>
                          <p className="mt-2 text-lg font-bold text-brand-600" data-testid={`cart-item-price-${item.productId}`}>
                            {formatPrice(item.product.price)}
                          </p>

                          {/* Quantity Controls */}
                          <div className="mt-4 flex items-center gap-4">
                            <div className="flex items-center border border-slate-200 rounded-lg" data-testid={`cart-item-quantity-controls-${item.productId}`} role="group" aria-label="Quantity controls">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  updateQuantity(item.productId, item.quantity - 1);
                                }}
                                className="p-2 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={item.quantity <= 1}
                                data-testid={`cart-item-decrease-${item.productId}`}
                                aria-label={`Decrease quantity of ${item.product.name}`}
                                type="button"
                              >
                                <Minus className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <span 
                                className="w-10 text-center font-medium" 
                                data-testid={`cart-item-quantity-${item.productId}`} 
                                aria-label="Quantity"
                                key={`quantity-${item.productId}-${item.quantity}`}
                              >
                                {item.quantity}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  updateQuantity(item.productId, item.quantity + 1);
                                }}
                                className="p-2 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={item.quantity >= item.product.stock}
                                data-testid={`cart-item-increase-${item.productId}`}
                                aria-label={`Increase quantity of ${item.product.name}`}
                                type="button"
                              >
                                <Plus className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                removeItem(item.productId);
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              data-testid={`cart-item-remove-${item.productId}`}
                              aria-label={`Remove ${item.product.name} from cart`}
                              type="button"
                            >
                              <Trash2 className="w-5 h-5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="hidden sm:block text-right">
                          <p className="text-sm text-slate-500">Subtotal</p>
                          <p className="text-xl font-bold text-slate-900" data-testid={`cart-item-subtotal-${item.productId}`}>
                            {formatPrice(item.product.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="sticky top-24" data-testid="cart-order-summary">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-6" data-testid="order-summary-heading">Order Summary</h2>

                  <div className="space-y-3">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span data-testid="order-subtotal">{formatPrice(totalAmount())}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Shipping</span>
                      <span className="text-green-600" data-testid="order-shipping">Free</span>
                    </div>
                  </div>

                  <div className="my-6 border-t border-slate-100" />

                  <div className="flex justify-between text-xl font-bold text-slate-900">
                    <span>Total</span>
                    <span data-testid="order-total">{formatPrice(totalAmount())}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <Button onClick={handleCheckout} className="w-full" size="lg" data-testid="proceed-to-checkout-button" aria-label="Proceed to checkout">
                    Proceed to Checkout
                    <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
                  </Button>
                  <Link to="/catalog" className="block mt-4">
                    <Button variant="ghost" className="w-full" data-testid="continue-shopping-link-button">
                      Continue Shopping
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

