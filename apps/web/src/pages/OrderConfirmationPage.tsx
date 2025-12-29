import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package, Truck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useOrder } from '@/hooks/useOrders';
import { formatPrice, formatDate } from '@qademo/shared';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id || '0', 10);
  const { data: order, isLoading, error } = useOrder(orderId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Order Not Found</h1>
          <p className="mt-2 text-slate-600">The order you're looking for doesn't exist.</p>
          <Link to="/catalog" className="mt-6 inline-block">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusVariant = {
    pending: 'warning',
    processing: 'info',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'error',
  } as const;

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Order Confirmed!</h1>
          <p className="mt-2 text-lg text-slate-600">
            Thank you for your order. We'll send you updates soon.
          </p>
          <p className="mt-2 text-brand-600 font-medium">Order #{order.id}</p>
        </motion.div>

        <div className="space-y-6">
          {/* Order Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Order Status</p>
                      <p className="text-sm text-slate-500">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <Badge variant={statusVariant[order.status as keyof typeof statusVariant] || 'default'}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Shipping Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-brand-600" />
                  <h2 className="text-lg font-bold text-slate-900">Shipping Information</h2>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-slate-900">
                  {order.shippingFirstName} {order.shippingLastName}
                </p>
                <p className="mt-1 text-slate-600 whitespace-pre-line">{order.shippingAddress}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Order Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <h2 className="text-lg font-bold text-slate-900">Order Items</h2>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100">
                  {order.items?.map((item) => (
                    <div key={item.id} className="py-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-900">{item.productName}</p>
                        <p className="text-sm text-slate-500">
                          {formatPrice(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium text-slate-900">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex justify-between text-xl font-bold text-slate-900">
                    <span>Total</span>
                    <span>{formatPrice(order.totalAmount)}</span>
                  </div>
                  {order.paymentLastFour && (
                    <p className="mt-2 text-sm text-slate-500">
                      Paid with card ending in {order.paymentLastFour}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link to="/catalog" className="flex-1">
              <Button className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Continue Shopping
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

