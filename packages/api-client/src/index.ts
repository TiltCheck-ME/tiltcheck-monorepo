/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/api-client
 * 
 * Typed API client for the TiltCheck API Gateway.
 * Handles authentication, cookies, and provides typed request/response handling.
 */

import type {
  Identity,
  DiscordUser,
  DBUser,
  DBTip,
  CreateTipPayload,
  PaginatedResult,
} from '@tiltcheck/types';

// ============================================================================
// Types
// ============================================================================

export interface APIClientConfig {
  /** Base URL for API Gateway (default: https://api.tiltcheck.me) */
  baseUrl?: string;
  /** Include credentials (cookies) in requests */
  credentials?: RequestCredentials;
  /** Default headers */
  headers?: Record<string, string>;
  /** Request timeout in ms */
  timeout?: number;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
}

export interface APIResult<T> {
  success: boolean;
  data?: T;
  error?: APIError;
}

// ============================================================================
// Response Types
// ============================================================================

export interface MeResponse {
  userId: string;
  type: string;
  discordId?: string;
  discordUsername?: string;
  walletAddress?: string;
  roles: string[];
  isAdmin: boolean;
}

export interface TipVerifyRequest {
  recipientDiscordId: string;
  amount: string;
  currency: string;
  signature?: string;
  message?: string;
  publicKey?: string;
}

export interface TipVerifyResponse {
  valid: boolean;
  sender: {
    userId: string;
    discordId?: string;
    walletAddress?: string;
  };
  recipient: {
    userId?: string;
    discordId: string;
    walletAddress?: string;
    isNewUser?: boolean;
  };
  amount: string;
  currency: string;
}

export interface TipCreateResponse {
  success: boolean;
  tip: {
    id: string;
    status: string;
    amount: string;
    currency: string;
    recipientDiscordId: string;
    createdAt: string;
  };
}

// ============================================================================
// API Client
// ============================================================================

export class TiltCheckAPIClient {
  private readonly baseUrl: string;
  private readonly credentials: RequestCredentials;
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeout: number;

  constructor(config: APIClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://api.tiltcheck.me';
    this.credentials = config.credentials || 'include';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    this.timeout = config.timeout || 30000;
  }

  // --------------------------------------------------------------------------
  // HTTP Methods
  // --------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<APIResult<T>> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...this.defaultHeaders,
          ...options?.headers,
        },
        credentials: this.credentials,
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || 'API_ERROR',
            message: data.message || data.error || 'Request failed',
            details: data.details,
          },
        };
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timed out',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  private get<T>(path: string, options?: RequestOptions): Promise<APIResult<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  private post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<APIResult<T>> {
    return this.request<T>('POST', path, body, options);
  }

  private put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<APIResult<T>> {
    return this.request<T>('PUT', path, body, options);
  }

  private delete<T>(path: string, options?: RequestOptions): Promise<APIResult<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  // --------------------------------------------------------------------------
  // Auth Endpoints
  // --------------------------------------------------------------------------

  /**
   * Get current user info from session
   */
  async getMe(): Promise<APIResult<MeResponse>> {
    return this.get<MeResponse>('/auth/me');
  }

  /**
   * Get Discord OAuth login URL
   */
  getDiscordLoginUrl(redirectUrl?: string): string {
    const params = new URLSearchParams();
    if (redirectUrl) {
      params.set('redirect', redirectUrl);
    }
    return `${this.baseUrl}/auth/discord/login${params.toString() ? '?' + params.toString() : ''}`;
  }

  /**
   * Logout current session
   */
  async logout(): Promise<APIResult<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/auth/logout');
  }

  // --------------------------------------------------------------------------
  // Tip Endpoints
  // --------------------------------------------------------------------------

  /**
   * Verify a tip request
   */
  async verifyTip(request: TipVerifyRequest): Promise<APIResult<TipVerifyResponse>> {
    return this.post<TipVerifyResponse>('/tip/verify', request);
  }

  /**
   * Create a new tip
   */
  async createTip(payload: CreateTipPayload): Promise<APIResult<TipCreateResponse>> {
    return this.post<TipCreateResponse>('/tip/create', payload);
  }

  /**
   * Complete a tip with transaction signature
   */
  async completeTip(tipId: string, txSignature: string): Promise<APIResult<DBTip>> {
    return this.post<DBTip>(`/tip/${tipId}/complete`, { txSignature });
  }

  /**
   * Get tip by ID
   */
  async getTip(tipId: string): Promise<APIResult<{ tip: DBTip }>> {
    return this.get<{ tip: DBTip }>(`/tip/${tipId}`);
  }

  // --------------------------------------------------------------------------
  // User Endpoints
  // --------------------------------------------------------------------------

  /**
   * Get user by Discord ID
   */
  async getUserByDiscordId(discordId: string): Promise<APIResult<DBUser>> {
    return this.get<DBUser>(`/users/discord/${discordId}`);
  }

  /**
   * Link wallet to current user
   */
  async linkWallet(walletAddress: string, signature: string, message: string): Promise<APIResult<DBUser>> {
    return this.post<DBUser>('/users/me/wallet', { walletAddress, signature, message });
  }

  // --------------------------------------------------------------------------
  // Health Endpoints
  // --------------------------------------------------------------------------

  /**
   * Check API health
   */
  async health(): Promise<APIResult<{ status: string; service: string; version: string }>> {
    return this.get('/health');
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an API client instance
 */
export function createAPIClient(config?: APIClientConfig): TiltCheckAPIClient {
  return new TiltCheckAPIClient(config);
}

/**
 * Default client for browser usage
 */
let defaultClient: TiltCheckAPIClient | null = null;

/**
 * Get the default API client
 */
export function getAPIClient(): TiltCheckAPIClient {
  if (!defaultClient) {
    defaultClient = createAPIClient();
  }
  return defaultClient;
}

/**
 * Set the default API client
 */
export function setDefaultAPIClient(client: TiltCheckAPIClient): void {
  defaultClient = client;
}

export default TiltCheckAPIClient;
