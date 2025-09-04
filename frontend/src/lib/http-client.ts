/**
 * Modern HTTP Client with enhanced features for ValuerPro API
 * Replaces axios with modern fetch-based implementation
 */

import type {
  ApiResponse,
  ApiErrorResponse,
  RequestConfig,
  RequestInterceptor,
  RequestMethod,
  RateLimitInfo,
  CacheConfig,
  CachedResponse,
} from '@/types/api';

// Configuration interface
interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  defaultHeaders?: Record<string, string>;
  interceptors?: RequestInterceptor;
  cache?: boolean;
}

// Cache implementation
class HttpCache {
  private cache = new Map<string, CachedResponse<unknown>>();
  private timers = new Map<string, NodeJS.Timeout>();

  set<T>(key: string, data: T, config: CacheConfig = {}): void {
    const ttl = config.ttl || 300; // Default 5 minutes
    const item: CachedResponse<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
      tags: config.tags,
    };

    this.cache.set(key, item);

    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl * 1000);

    this.timers.set(key, timer);
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CachedResponse<T> | undefined;
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  invalidateByTag(tag: string): void {
    for (const [key, item] of this.cache.entries()) {
      if (item.tags?.includes(tag)) {
        this.delete(key);
      }
    }
  }
}

// Rate limiting tracker
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  canMakeRequest(endpoint: string, limit = 60, windowMs = 60000): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = `${endpoint}:${windowMs}`;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const timestamps = this.requests.get(key)!;
    
    // Remove old timestamps
    const recentTimestamps = timestamps.filter(time => time > windowStart);
    this.requests.set(key, recentTimestamps);
    
    return recentTimestamps.length < limit;
  }
  
  recordRequest(endpoint: string, windowMs = 60000): void {
    const key = `${endpoint}:${windowMs}`;
    const timestamps = this.requests.get(key) || [];
    timestamps.push(Date.now());
    this.requests.set(key, timestamps);
  }
}

export class HttpClient {
  private config: HttpClientConfig;
  private cache: HttpCache;
  private rateLimiter: RateLimiter;

  constructor(config: HttpClientConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      retries: 3,
      retryDelay: 1000,
      cache: true,
      ...config,
    };
    
    this.cache = new HttpCache();
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Make HTTP request with modern fetch API
   */
  async request<T = unknown>(
    method: RequestMethod,
    endpoint: string,
    options: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const cacheKey = this.getCacheKey(method, url, options);
    
    // Check cache for GET requests
    if (method === 'GET' && this.config.cache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) {
        return {
          data: cached,
          success: true,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Rate limiting check
    if (!this.rateLimiter.canMakeRequest(endpoint)) {
      throw new ApiErrorResponse({
        error: 'Rate limit exceeded',
        status_code: 429,
        timestamp: new Date().toISOString(),
        path: endpoint,
      });
    }

    // For DELETE operations, disable retries completely to prevent confusion
    const maxRetries = method === 'DELETE' ? 0 : (options.retries || this.config.retries || 0);
    
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      try {
        const response = await this.executeRequest<T>(method, url, options);
        
        // Cache successful GET responses
        if (method === 'GET' && this.config.cache && response.success) {
          this.cache.set(cacheKey, response.data, { ttl: 300 });
        }

        // Record successful request
        this.rateLimiter.recordRequest(endpoint);
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx) except 429
        if (error instanceof ApiErrorResponse) {
          if (error.status_code >= 400 && error.status_code < 500 && error.status_code !== 429) {
            throw error;
          }
        }

        attempt++;
        
        if (attempt <= maxRetries) {
          const delay = (options.retryDelay || this.config.retryDelay || 1000) * attempt;
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Execute the actual fetch request
   */
  private async executeRequest<T>(
    method: RequestMethod,
    url: string,
    options: RequestConfig
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeout = options.timeout || this.config.timeout;

    // Set timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Prepare headers
      const headers = new Headers({
        'Content-Type': 'application/json',
        ...this.config.defaultHeaders,
        ...options.headers,
      });

      // Get auth token
      const token = this.getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // Prepare request options
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: options.signal || controller.signal,
      };

      // Add body for non-GET requests
      if (method !== 'GET' && options.body) {
        if (options.body instanceof FormData) {
          // Don't set Content-Type for FormData, let browser set it
          headers.delete('Content-Type');
          fetchOptions.body = options.body;
        } else {
          fetchOptions.body = JSON.stringify(options.body);
        }
      }

      // Apply request interceptor
      if (this.config.interceptors?.onRequest) {
        const modifiedConfig = await this.config.interceptors.onRequest({
          ...options,
          headers: Object.fromEntries(headers.entries()),
        });
        
        // Update headers from interceptor
        Object.entries(modifiedConfig.headers || {}).forEach(([key, value]) => {
          headers.set(key, value);
        });
      }

      // Make request
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Parse response
      let responseData: T | undefined;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else if (contentType?.includes('text/')) {
        responseData = (await response.text()) as unknown as T;
      } else {
        responseData = (await response.blob()) as unknown as T;
      }

      // Handle HTTP errors
      if (!response.ok) {
        const errorResponse: ApiErrorResponse = {
          error: responseData?.error || response.statusText || 'Request failed',
          detail: responseData?.detail,
          status_code: response.status,
          timestamp: new Date().toISOString(),
          path: url,
        };

        // Apply error interceptor
        if (this.config.interceptors?.onError) {
          await this.config.interceptors.onError(errorResponse);
        }

        // Handle specific error codes
        if (response.status === 401) {
          this.handleUnauthorized();
        } else if (response.status === 429) {
          this.handleRateLimit(response);
        }

        throw new ApiErrorResponse(errorResponse);
      }

      // Build successful response
      const apiResponse: ApiResponse<T> = {
        data: responseData!,
        success: true,
        timestamp: new Date().toISOString(),
      };

      // Apply response interceptor
      if (this.config.interceptors?.onResponse) {
        return await this.config.interceptors.onResponse(apiResponse);
      }

      return apiResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new ApiErrorResponse({
          error: 'Request timeout',
          status_code: 408,
          timestamp: new Date().toISOString(),
          path: url,
        });
      }

      throw error;
    }
  }

  /**
   * Convenience methods
   */
  async get<T = unknown>(endpoint: string, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, options);
  }

  async post<T = unknown>(endpoint: string, data?: unknown, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, { ...options, body: data });
  }

  async put<T = unknown>(endpoint: string, data?: unknown, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, { ...options, body: data });
  }

  async patch<T = unknown>(endpoint: string, data?: unknown, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, { ...options, body: data });
  }

  async delete<T = unknown>(endpoint: string, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, options);
  }

  /**
   * Utility methods
   */
  private buildUrl(endpoint: string): string {
    const baseURL = this.config.baseURL.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseURL}${path}`;
  }

  private getCacheKey(method: string, url: string, options: RequestConfig): string {
    const key = `${method}:${url}`;
    if (options.body && typeof options.body === 'object') {
      return `${key}:${JSON.stringify(options.body)}`;
    }
    return key;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  }

  private handleUnauthorized(): void {
    // Clear auth tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');
      
      // Redirect to login if not already on auth page
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/auth/')) {
        window.location.href = '/auth/login';
      }
    }
  }

  private handleRateLimit(response: Response): void {
    const retryAfter = response.headers.get('retry-after');
    const resetTime = response.headers.get('x-rate-limit-reset');
    
    console.warn('Rate limit exceeded', {
      retryAfter,
      resetTime,
      endpoint: response.url,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cache management
   */
  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(tag: string): void {
    this.cache.invalidateByTag(tag);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HttpClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get rate limit info
   */
  getRateLimitInfo(endpoint: string): RateLimitInfo {
    // This would be populated by response headers in a real implementation
    return {
      limit: 60,
      remaining: 60,
      reset: Date.now() + 60000,
    };
  }
}

// Custom error class for API errors
class ApiErrorResponse extends Error {
  public error: string;
  public detail?: string;
  public status_code: number;
  public timestamp: string;
  public path?: string;

  constructor(data: Omit<ApiErrorResponse, keyof Error>) {
    super(data.error);
    this.name = 'ApiErrorResponse';
    this.error = data.error;
    this.detail = data.detail;
    this.status_code = data.status_code;
    this.timestamp = data.timestamp;
    this.path = data.path;
  }
}

// Export the error class
export { ApiErrorResponse };

// Create default client instance
const defaultConfig: HttpClientConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  cache: true,
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-HTTP-Client-Version': '1.1.0', // Version bump to force cache invalidation
  },
};

export const httpClient = new HttpClient(defaultConfig);
export default httpClient;