import type { Cart, Order, Product } from '@qademo/shared';
import { formatPrice } from '@qademo/shared';

interface PublicUser {
  id: number;
  username: string;
  userType: string;
  email?: string;
}

export function presentProduct(product: Product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    priceLabel: formatPrice(product.price),
    stock: product.stock,
    inStock: product.stock > 0,
    path: `/products/${product.slug}`,
  };
}

export function presentCart(cart: Cart) {
  return {
    totalItems: cart.totalItems,
    totalAmount: cart.totalAmount,
    totalLabel: formatPrice(cart.totalAmount),
    path: '/cart',
    items: cart.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      slug: item.product.slug,
      quantity: item.quantity,
      unitPrice: item.product.price,
      lineTotal: Number((item.quantity * item.product.price).toFixed(2)),
    })),
  };
}

export function presentOrder(order: Order) {
  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    totalLabel: formatPrice(order.totalAmount),
    paymentLastFour: order.paymentLastFour,
    shippingName: `${order.shippingFirstName} ${order.shippingLastName}`.trim(),
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt,
    path: `/orders/${order.id}`,
    items: (order.items ?? []).map((item) => ({
      productId: item.productId,
      name: item.productName ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}

export function presentUser(user: PublicUser) {
  return {
    id: user.id,
    username: user.username,
    userType: user.userType,
    email: user.email ?? null,
  };
}
