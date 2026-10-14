import type {
  ApiResponse,
  Product,
  User,
  Order,
  Cart,
  AuthResponse,
  CreateOrderInput,
  SignupInput,
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
  async login(username: string, password: string, signal?: AbortSignal): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      signal,
    });
    this.accessToken = response.accessToken;
    return response;
  }

  async signup(data: SignupInput, signal?: AbortSignal): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
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

  async logout(signal?: AbortSignal): Promise<void> {
    await this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
      signal,
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
  async getProducts(signal?: AbortSignal): Promise<Product[]> {
    return this.request<Product[]>('/products', { signal });
  }

  async getProduct(slug: string, signal?: AbortSignal): Promise<Product> {
    return this.request<Product>(`/products/${encodeURIComponent(slug)}`, { signal });
  }

  async getProductById(id: number, signal?: AbortSignal): Promise<Product> {
    return this.request<Product>(`/products/id/${id}`, { signal });
  }

  // Cart methods
  async getCart(signal?: AbortSignal): Promise<Cart> {
    return this.request<Cart>('/cart', { signal });
  }

  async addToCart(
    productId: number,
    quantity = 1,
    signal?: AbortSignal
  ): Promise<{ productId: number; quantity: number; totalItems: number }> {
    return this.request('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
      signal,
    });
  }

  async updateCartItem(
    productId: number,
    quantity: number,
    signal?: AbortSignal
  ): Promise<{ productId: number; quantity: number; totalItems: number }> {
    return this.request(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
      signal,
    });
  }

  async removeFromCart(
    productId: number,
    signal?: AbortSignal
  ): Promise<{ productId: number; removed: boolean; totalItems: number }> {
    return this.request(`/cart/items/${productId}`, {
      method: 'DELETE',
      signal,
    });
  }

  async clearCart(signal?: AbortSignal): Promise<{ cleared: boolean; totalItems: number }> {
    return this.request('/cart', {
      method: 'DELETE',
      signal,
    });
  }

  // Order methods
  async getOrders(signal?: AbortSignal): Promise<Order[]> {
    return this.request<Order[]>('/orders', { signal });
  }

  async getOrder(id: number, signal?: AbortSignal): Promise<Order> {
    return this.request<Order>(`/orders/${id}`, { signal });
  }

  async createOrder(data: CreateOrderInput, signal?: AbortSignal): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  // Admin methods
  async getAdminProducts(): Promise<Product[]> {
    return this.request<Product[]>('/admin/products');
  }

  async updateProductStock(
    productId: number,
    stock: number,
    signal?: AbortSignal
  ): Promise<{ id: number; stock: number }> {
    return this.request(`/admin/products/${productId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
      signal,
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

  async getAdminOrders(signal?: AbortSignal): Promise<(Order & { username: string })[]> {
    return this.request('/admin/orders', { signal });
  }

  async updateOrderStatus(
    orderId: number,
    status: string,
    signal?: AbortSignal
  ): Promise<{ id: number; status: string }> {
    return this.request(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      signal,
    });
  }

  async getAdminStats(signal?: AbortSignal): Promise<{
    counts: { products: number; orders: number; users: number; pendingOrders: number };
    recentOrders: Array<{ id: number; totalAmount: number; status: string; createdAt: string; username: string }>;
    lowStockProducts: Array<{ id: number; name: string; stock: number }>;
  }> {
    return this.request('/admin/stats', { signal });
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

