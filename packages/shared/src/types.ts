/**
 * User Types
 */
export type UserType = 'standard' | 'locked' | 'admin';

export interface User {
  id: number;
  username: string;
  userType: UserType;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Product Types
 */
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  imageKey: string | null;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cart Types
 */
export interface CartItem {
  productId: number;
  quantity: number;
  product: Product;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
}

/**
 * Order Types
 */
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  productName?: string;
}

export interface Order {
  id: number;
  userId: number;
  totalAmount: number;
  status: OrderStatus;
  shippingFirstName: string;
  shippingLastName: string;
  shippingAddress: string;
  paymentLastFour: string | null;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    username: string;
    userType: UserType;
  };
}

