import type {
  ApiResponse,
  Product,
  User,
  Order,
  Cart,
  AuthResponse,
  CreateOrderInput,
} from '@qademo/shared';

// API is now same-origin (Pages Functions), so always use relative path
const API_BASE = '/api';

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
function getSessionId(): string {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('session_id', sessionId);
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

    const data: ApiResponse<T> = await response.json();

    if (!data.success || data.error) {
      const error = new Error(data.error?.message || 'Unknown error');
      (error as Error & { code: string }).code = data.error?.code || 'UNKNOWN';
      throw error;
    }

    return data.data as T;
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
  async getAdminProducts(): Promise<Product[]> {
    return this.request<Product[]>('/admin/products');
  }

  async updateProductStock(productId: number, stock: number): Promise<{ id: number; stock: number }> {
    return this.request(`/admin/products/${productId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
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
}

export const api = new ApiClient();

