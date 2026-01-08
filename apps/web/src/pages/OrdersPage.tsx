import { Link } from 'react-router-dom';
import { Package, ShoppingBag, ArrowRight, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useOrders } from '@/hooks/useOrders';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice, formatDate } from '@qademo/shared';
import Button from '@/components/ui/Button';
import Card, { CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const statusVariant = {
  pending: 'warning',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error',
} as const;

export default function OrdersPage() {
  const { user } = useAuthStore();
  const { data: orders, isLoading, error } = useOrders();

  if (isLoading) {
    return <LoadingSpinner data-testid="orders-loading" />;
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-testid="orders-page">
        <div className="text-center" data-testid="orders-error">
          <h1 className="text-2xl font-bold text-slate-900">Failed to load orders</h1>
          <p className="mt-2 text-slate-600">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12" data-testid="orders-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-brand-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900" data-testid="orders-heading">My Orders</h1>
              <p className="text-slate-600" data-testid="orders-welcome">Welcome back, {user?.username}</p>
            </div>
          </div>
        </motion.div>

        {/* Orders List */}
        {!orders || orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="orders-empty-state"
          >
            <Card>
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                  <ShoppingBag className="w-8 h-8 text-slate-400" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">No orders yet</h2>
                <p className="mt-2 text-slate-600">
                  When you place orders, they'll appear here.
                </p>
                <Link to="/catalog" className="mt-6 inline-block">
                  <Button rightIcon={<ArrowRight className="w-4 h-4" />} data-testid="start-shopping-button">
                    Start Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4" data-testid="orders-list" role="list" aria-label="Order history">
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                data-testid={`order-item-${order.id}`}
                role="listitem"
              >
                <Link to={`/orders/${order.id}`} data-testid={`order-link-${order.id}`} aria-label={`View order #${order.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Order Info */}
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-brand-600" aria-hidden="true" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-slate-900" data-testid={`order-number-${order.id}`}>
                                Order #{order.id}
                              </h3>
                              <Badge
                                variant={
                                  statusVariant[order.status as keyof typeof statusVariant] ||
                                  'default'
                                }
                                data-testid={`order-status-${order.id}`}
                              >
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500" data-testid={`order-date-${order.id}`}>
                              <Clock className="w-4 h-4" aria-hidden="true" />
                              {formatDate(order.createdAt)}
                            </div>
                            {order.items && order.items.length > 0 && (
                              <p className="mt-2 text-sm text-slate-600" data-testid={`order-items-${order.id}`}>
                                {order.items.length} item{order.items.length > 1 ? 's' : ''}
                                {order.items.length <= 3 && (
                                  <span className="text-slate-400">
                                    {' '}• {order.items.map((item) => item.productName).join(', ')}
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Price and Arrow */}
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900" data-testid={`order-total-${order.id}`}>
                              {formatPrice(order.totalAmount)}
                            </p>
                            <p className="text-sm text-slate-500" data-testid={`order-customer-${order.id}`}>
                              {order.shippingFirstName} {order.shippingLastName}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-400" aria-hidden="true" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Continue Shopping */}
        {orders && orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <Link to="/catalog">
              <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />} data-testid="continue-shopping-from-orders-button">
                Continue Shopping
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}

