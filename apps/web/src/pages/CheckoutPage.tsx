import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, CreditCard, Truck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCartStore } from '@/stores/cartStore';
import { useCreateOrder } from '@/hooks/useOrders';
import { formatPrice, isValidCardNumber } from '@qademo/shared';
import { getImageUrl } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';

interface CheckoutForm {
  firstName: string;
  lastName: string;
  address: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  nameOnCard: string;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totalAmount, clearCart } = useCartStore();
  const createOrder = useCreateOrder();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutForm>();

  // Redirect if cart is empty
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
          <p className="mt-2 text-slate-600">Add items to your cart before checkout.</p>
          <Link to="/catalog" className="mt-6 inline-block">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: CheckoutForm) => {
    setError(null);

    // Validate card number
    if (!isValidCardNumber(data.cardNumber)) {
      setError('Invalid card number. Please check and try again.');
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        shipping: {
          firstName: data.firstName,
          lastName: data.lastName,
          address: data.address,
        },
        payment: {
          cardNumber: data.cardNumber.replace(/\s/g, ''),
          expiryDate: data.expiry,
          cvv: data.cvv,
          cardholderName: data.nameOnCard,
        },
      });

      clearCart();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/cart"
          className="inline-flex items-center text-sm text-slate-600 hover:text-brand-600 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Checkout Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Shipping Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-brand-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Shipping Information</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      {...register('firstName', { required: 'First name is required' })}
                      error={errors.firstName?.message}
                    />
                    <Input
                      label="Last Name"
                      {...register('lastName', { required: 'Last name is required' })}
                      error={errors.lastName?.message}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Shipping Address
                    </label>
                    <textarea
                      {...register('address', { required: 'Address is required' })}
                      rows={3}
                      className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="Enter your full address"
                    />
                    {errors.address && (
                      <p className="mt-1.5 text-sm text-red-600">{errors.address.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-brand-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Payment Information</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Card Number"
                    {...register('cardNumber', {
                      required: 'Card number is required',
                      pattern: {
                        value: /^[\d\s]{13,19}$/,
                        message: 'Invalid card number format',
                      },
                    })}
                    placeholder="1234 5678 9012 3456"
                    error={errors.cardNumber?.message}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Expiry Date"
                      {...register('expiry', {
                        required: 'Expiry is required',
                        pattern: {
                          value: /^\d{2}\/\d{2}$/,
                          message: 'Format: MM/YY',
                        },
                      })}
                      placeholder="MM/YY"
                      error={errors.expiry?.message}
                    />
                    <Input
                      label="CVV"
                      {...register('cvv', {
                        required: 'CVV is required',
                        pattern: {
                          value: /^\d{3,4}$/,
                          message: '3-4 digits',
                        },
                      })}
                      placeholder="123"
                      error={errors.cvv?.message}
                      maxLength={4}
                    />
                  </div>
                  <Input
                    label="Name on Card"
                    {...register('nameOnCard', { required: 'Name is required' })}
                    error={errors.nameOnCard?.message}
                  />
                </CardContent>
              </Card>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Place Order - {formatPrice(totalAmount())}
              </Button>
            </form>
          </motion.div>

          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="sticky top-24">
              <CardHeader>
                <h2 className="text-xl font-bold text-slate-900">Order Summary</h2>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <div key={item.productId} className="py-4 flex gap-4">
                      <img
                        src={getImageUrl(item.product.imageUrl)}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 line-clamp-1">
                          {item.product.name}
                        </p>
                        <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-slate-900">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(totalAmount())}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-slate-900 pt-3 border-t border-slate-100">
                    <span>Total</span>
                    <span>{formatPrice(totalAmount())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

