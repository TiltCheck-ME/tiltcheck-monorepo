/**
 * @tiltcheck/shared - API Client
 * Type-safe API client with authentication support
 */

import {
  registerSchema,
  loginSchema,
  authResponseSchema,
  userSchema,
  errorSchema,
  type RegisterRequest,
  type LoginRequest,
  type AuthResponse,
  type User,
  type ErrorResponse,
} from './schemas.js';

// ============================================================================
// Client Configuration
// ============================================================================

export interface ClientConfig {
  baseUrl?: string;
  token?: string;
  fetch?: typeof fetch;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// ============================================================================
// API Client Class
// ============================================================================

export class TiltCheckClient {
  private baseUrl: string;
  private token: string | null;
  private fetchFn: typeof fetch;

  constructor(config: ClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:4000';
    this.token = config.token || null;
    this.fetchFn = config.fetch || globalThis.fetch;
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null): void {
    this.token = token;
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Make authenticated request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: options.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = errorSchema.parse(data);
      throw new TiltCheckAPIError(error.error, error.code, response.status, error.details);
    }

    return data as T;
  }

  // ============================================================================
  // Auth Methods
  // ============================================================================

  /**
   * Register a new user
   */
  async register(payload: RegisterRequest, options?: RequestOptions): Promise<AuthResponse> {
    registerSchema.parse(payload);
    const response = await this.request<AuthResponse>('POST', '/auth/register', payload, options);
    this.token = response.token;
    return response;
  }

  /**
   * Login with email and password
   */
  async login(payload: LoginRequest, options?: RequestOptions): Promise<AuthResponse> {
    loginSchema.parse(payload);
    const response = await this.request<AuthResponse>('POST', '/auth/login', payload, options);
    this.token = response.token;
    return response;
  }

  /**
   * Get current user info
   */
  async me(options?: RequestOptions): Promise<User> {
    return this.request<User>('GET', '/auth/me', undefined, options);
  }

  /**
   * Logout (client-side only - clears token)
   */
  logout(): void {
    this.token = null;
  }
}

// ============================================================================
// Error Class
// ============================================================================

export class TiltCheckAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TiltCheckAPIError';
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new TiltCheck API client
 */
export function createClient(config?: ClientConfig): TiltCheckClient {
  return new TiltCheckClient(config);
}
