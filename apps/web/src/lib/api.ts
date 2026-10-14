import {
  BULK_DELETE_ID_LIMIT,
  type AdminProductQuery,
  type ApiResponse,
  type AuthResponse,
  type BulkDeleteProductsInput,
  type BulkDeleteProductsResult,
  type Cart,
  type CreateOrderInput,
  type Order,
  type Product,
  type SignupInput,
  type User,
} from '@qademo/shared';

// API Configuration - externalized for test automation
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Get the full URL for an image
 * Since API is same-origin, just return the path as-is
 */
export function getImageUrl(imageUrl: string | undefined | null): string {
  if (!imageUrl) {
    return '/placeholder.jpg';
  }
  
  // If it's already an absolute URL, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Return relative paths as-is (same origin)
  return imageUrl;
}

// Generate a session ID for cart management
// Externalized storage key for test automation
const SESSION_STORAGE_KEY = import.meta.env.VITE_SESSION_STORAGE_KEY || 'session_id';

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const data = await this.requestRaw<T>(endpoint, options);
    return data.data as T;
  }

  private async requestRaw<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Session-ID': getSessionId(),
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = (await response.json()) as ApiResponse<T>;

    if (!data.success || data.error) {
      const error = new Error(data.error?.message || 'Unknown error');
      (error as Error & { code: string }).code = data.error?.code || 'UNKNOWN';
      throw error;
    }

    return data;
  }

  // Auth methods
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.accessToken = response.accessToken;
    return response;
  }

  async signup(data: SignupInput): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.accessToken = response.accessToken;
    return response;
  }

  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    this.accessToken = response.accessToken;
    return response;
  }

  async getGoogleConfig(): Promise<{ clientId: string }> {
    return this.request<{ clientId: string }>('/auth/google/config');
  }

  async logout(): Promise<void> {
    await this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
    this.accessToken = null;
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
    });
    this.accessToken = response.accessToken;
    return response;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Product methods
  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products');
  }

  async getProduct(slug: string): Promise<Product> {
    return this.request<Product>(`/products/${slug}`);
  }

  // Cart methods
  async getCart(): Promise<Cart> {
    return this.request<Cart>('/cart');
  }

  async addToCart(productId: number, quantity = 1): Promise<{ productId: number; quantity: number; totalItems: number }> {
    return this.request('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  }

  async updateCartItem(productId: number, quantity: number): Promise<{ productId: number; quantity: number; totalItems: number }> {
    return this.request(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(productId: number): Promise<{ productId: number; removed: boolean; totalItems: number }> {
    return this.request(`/cart/items/${productId}`, {
      method: 'DELETE',
    });
  }

  async clearCart(): Promise<{ cleared: boolean; totalItems: number }> {
    return this.request('/cart', {
      method: 'DELETE',
    });
  }

  // Order methods
  async getOrders(): Promise<Order[]> {
    return this.request<Order[]>('/orders');
  }

  async getOrder(id: number): Promise<Order> {
    return this.request<Order>(`/orders/${id}`);
  }

  async createOrder(data: CreateOrderInput): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Admin methods
  async getAdminProducts(query: Partial<AdminProductQuery> = {}): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params = new URLSearchParams();
    if (query.name) params.set('name', query.name);
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.sort) params.set('sort', query.sort);
    if (query.direction) params.set('direction', query.direction);
    if (query.page) params.set('page', String(query.page));

    const search = params.toString();
    const response = await this.requestRaw<Product[]>(
      `/admin/products${search ? `?${search}` : ''}`
    );

    return {
      products: response.data ?? [],
      total: response.meta?.total ?? response.data?.length ?? 0,
      page: response.meta?.page ?? query.page ?? 1,
      limit: response.meta?.limit ?? response.data?.length ?? 0,
    };
  }

  async bulkDeleteProducts(input: BulkDeleteProductsInput): Promise<BulkDeleteProductsResult> {
    if (input.ids?.length) {
      return this.bulkDeleteByIds(input.ids);
    }

    return this.request<BulkDeleteProductsResult>('/admin/products/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ match: input.match }),
    });
  }

  private async bulkDeleteByIds(ids: number[]): Promise<BulkDeleteProductsResult> {
    const totals: BulkDeleteProductsResult = {
      requested: 0,
      deleted: 0,
      deactivated: 0,
      notFound: 0,
      hasMore: false,
    };

    for (let index = 0; index < ids.length; index += BULK_DELETE_ID_LIMIT) {
      const result = await this.request<BulkDeleteProductsResult>('/admin/products/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: ids.slice(index, index + BULK_DELETE_ID_LIMIT) }),
      });
      totals.requested += result.requested;
      totals.deleted += result.deleted;
      totals.deactivated += result.deactivated;
      totals.notFound += result.notFound;
    }

    return totals;
  }

  async updateProductStock(productId: number, stock: number): Promise<{ id: number; stock: number }> {
    return this.request(`/admin/products/${productId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    });
  }

  async createProduct(data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    imageKey?: string;
  }): Promise<{ id: number; slug: string }> {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(
    productId: number,
    data: {
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
      imageKey?: string;
      isActive?: boolean;
    }
  ): Promise<{ id: number; updated: boolean }> {
    return this.request(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(productId: number): Promise<{ id: number; deleted: boolean }> {
    return this.request(`/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async getAdminOrders(): Promise<(Order & { username: string })[]> {
    return this.request('/admin/orders');
  }

  async updateOrderStatus(
    orderId: number,
    status: string
  ): Promise<{ id: number; status: string }> {
    return this.request(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getAdminStats(): Promise<{
    counts: { products: number; orders: number; users: number; pendingOrders: number };
    recentOrders: Array<{ id: number; totalAmount: number; status: string; createdAt: string; username: string }>;
    lowStockProducts: Array<{ id: number; name: string; stock: number }>;
  }> {
    return this.request('/admin/stats');
  }

  async uploadImage(file: File, folder = 'products'): Promise<{
    key: string;
    url: string;
    size: number;
    type: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const headers: HeadersInit = {
      'X-Session-ID': getSessionId(),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}/images`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    const data = await response.json();

    if (!data.success || data.error) {
      const error = new Error(data.error?.message || 'Upload failed');
      (error as Error & { code: string }).code = data.error?.code || 'UPLOAD_FAILED';
      throw error;
    }

    return data.data;
  }
}

export const api = new ApiClient();

