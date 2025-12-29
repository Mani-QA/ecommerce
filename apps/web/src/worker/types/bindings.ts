import type { User, UserType } from '@qademo/shared';

// Cloudflare Worker bindings
export interface Env {
  // D1 Database
  DB: D1Database;

  // R2 Bucket for images
  R2_BUCKET: R2Bucket;

  // KV Namespace for sessions
  KV_SESSIONS: KVNamespace;

  // Static Assets (Workers Static Assets)
  ASSETS: Fetcher;

  // Environment variables
  ENVIRONMENT: string;
  JWT_SECRET: string;
}

// Context variables set by middleware
export interface Variables {
  user?: {
    id: number;
    username: string;
    userType: UserType;
  };
  sessionId?: string;
}

// Database row types (snake_case from D1)
export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  user_type: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  image_key: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  shipping_first_name: string;
  shipping_last_name: string;
  shipping_address: string;
  payment_last_four: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: number;
  refresh_token_hash: string;
  expires_at: string;
  created_at: string;
}

// Transform functions
export function userRowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    userType: row.user_type as UserType,
    email: row.email ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function productRowToProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    stock: row.stock,
    imageKey: row.image_key,
    imageUrl: undefined as string | undefined,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function orderRowToOrder(row: OrderRow) {
  return {
    id: row.id,
    userId: row.user_id,
    totalAmount: row.total_amount,
    status: row.status,
    shippingFirstName: row.shipping_first_name,
    shippingLastName: row.shipping_last_name,
    shippingAddress: row.shipping_address,
    paymentLastFour: row.payment_last_four,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

