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
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Failed to load orders</h1>
          <p className="mt-2 text-slate-600">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Orders</h1>
              <p className="text-slate-600">Welcome back, {user?.username}</p>
            </div>
          </div>
        </motion.div>

        {/* Orders List */}
        {!orders || orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                  <ShoppingBag className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">No orders yet</h2>
                <p className="mt-2 text-slate-600">
                  When you place orders, they'll appear here.
                </p>
                <Link to="/catalog" className="mt-6 inline-block">
                  <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Start Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/orders/${order.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Order Info */}
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-brand-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-slate-900">
                                Order #{order.id}
                              </h3>
                              <Badge
                                variant={
                                  statusVariant[order.status as keyof typeof statusVariant] ||
                                  'default'
                                }
                              >
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                              <Clock className="w-4 h-4" />
                              {formatDate(order.createdAt)}
                            </div>
                            {order.items && order.items.length > 0 && (
                              <p className="mt-2 text-sm text-slate-600">
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
                            <p className="text-lg font-bold text-slate-900">
                              {formatPrice(order.totalAmount)}
                            </p>
                            <p className="text-sm text-slate-500">
                              {order.shippingFirstName} {order.shippingLastName}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-400" />
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
              <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Continue Shopping
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}

