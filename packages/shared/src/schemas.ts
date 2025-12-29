import { z } from 'zod';

/**
 * Authentication Schemas
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Product Schemas
 */
export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  price: z.number().positive('Price must be positive'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  imageKey: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  imageKey: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Cart Schemas
 */
export const addToCartSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().max(99, 'Maximum quantity is 99'),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(99, 'Maximum quantity is 99'),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

/**
 * Order Schemas
 */
export const shippingSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  address: z.string().min(1, 'Address is required').max(500),
});

export const paymentSchema = z.object({
  cardNumber: z.string().min(13).max(19),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Invalid expiry format (MM/YY)'),
  cvv: z.string().regex(/^\d{3,4}$/, 'Invalid CVV'),
  cardholderName: z.string().min(1, 'Cardholder name is required'),
});

export const createOrderSchema = z.object({
  shipping: shippingSchema,
  payment: paymentSchema,
});

export type ShippingInput = z.infer<typeof shippingSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Admin Schemas
 */
export const updateStockSchema = z.object({
  stock: z.number().int().min(0),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
});

export type UpdateStockInput = z.infer<typeof updateStockSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

