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
  DBUser,
  DBTip,
  CreateTipPayload,
} from '@tiltcheck/types';

// ============================================================================
// Types
// ============================================================================

export interface ApiClientConfig {
  /** Base URL for the API */
  baseURL: string;
  /** Include credentials (cookies) in requests */
  credentials?: RequestCredentials;
  /** Default headers applied to every request */
  headers?: Record<string, string>;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

/** Subset of APIClientConfig kept for backward compat with TiltCheckAPIClient */
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
// Interceptor Types
// ============================================================================

export type RequestInterceptorFn = (
  config: InternalRequestConfig
) => InternalRequestConfig | Promise<InternalRequestConfig>;

export type ResponseInterceptorFn = (
  response: Response
) => Response | Promise<Response>;

export type ResponseErrorInterceptorFn = (
  error: ApiHttpError
) => never | Promise<never>;

/** Internal representation of a request before it is dispatched */
export interface InternalRequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

class InterceptorManager<T> {
  private handlers: Array<T | null> = [];

  use(fn: T): number {
    this.handlers.push(fn);
    return this.handlers.length - 1;
  }

  eject(id: number): void {
    if (this.handlers[id] !== undefined) {
      this.handlers[id] = null;
    }
  }

  forEach(fn: (handler: T) => void): void {
    for (const handler of this.handlers) {
      if (handler !== null) {
        fn(handler);
      }
    }
  }
}

// ============================================================================
// Typed HTTP Error
// ============================================================================

export class ApiHttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;
  readonly code: string;

  constructor(status: number, statusText: string, body: unknown) {
    const code =
      body != null &&
      typeof body === 'object' &&
      'code' in body &&
      typeof (body as Record<string, unknown>).code === 'string'
        ? (body as Record<string, string>).code
        : `HTTP_${status}`;

    const message =
      body != null &&
      typeof body === 'object' &&
      'message' in body &&
      typeof (body as Record<string, unknown>).message === 'string'
        ? (body as Record<string, string>).message
        : statusText || `Request failed with status ${status}`;

    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.code = code;
  }
}

// ============================================================================
// Base ApiClient
// ============================================================================

/**
 * Generic base HTTP client built on native fetch.
 *
 * Features:
 *  - Constructor accepts `baseURL`
 *  - Public `get`, `post`, `put`, `delete` methods
 *  - `interceptors.request` and `interceptors.response` for middleware
 *  - JSON serialization / deserialization
 *  - Throws `ApiHttpError` on non-2xx responses
 *  - Per-request timeout via AbortController
 *
 * @example
 * ```ts
 * const client = new ApiClient({ baseURL: 'https://api.example.com' });
 *
 * // Add a Bearer token to every request
 * client.interceptors.request.use((config) => {
 *   config.headers['Authorization'] = `Bearer ${getToken()}`;
 *   return config;
 * });
 *
 * const user = await client.get<User>('/users/me');
 * ```
 */
export class ApiClient {
  protected readonly baseURL: string;
  protected readonly defaultHeaders: Record<string, string>;
  protected readonly defaultCredentials: RequestCredentials;
  protected readonly timeout: number;

  readonly interceptors: {
    request: InterceptorManager<RequestInterceptorFn>;
    response: InterceptorManager<ResponseInterceptorFn>;
  };

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    this.defaultCredentials = config.credentials ?? 'same-origin';
    this.timeout = config.timeout ?? 30_000;

    this.interceptors = {
      request: new InterceptorManager<RequestInterceptorFn>(),
      response: new InterceptorManager<ResponseInterceptorFn>(),
    };
  }

  // --------------------------------------------------------------------------
  // Core request dispatch
  // --------------------------------------------------------------------------

  private async dispatch<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Build initial config
      let config: InternalRequestConfig = {
        url: `${this.baseURL}${path}`,
        method: method.toUpperCase(),
        headers: {
          ...this.defaultHeaders,
          ...options?.headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: options?.signal ?? controller.signal,
        credentials: this.defaultCredentials,
      };

      // Run request interceptors in order
      const requestInterceptors: RequestInterceptorFn[] = [];
      this.interceptors.request.forEach((fn) => requestInterceptors.push(fn));
      for (const fn of requestInterceptors) {
        config = await fn(config);
      }

      // Issue the fetch
      let response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal: config.signal,
        credentials: config.credentials,
      });

      // Run response interceptors in order
      const responseInterceptors: ResponseInterceptorFn[] = [];
      this.interceptors.response.forEach((fn) => responseInterceptors.push(fn));
      for (const fn of responseInterceptors) {
        response = await fn(response);
      }

      // Deserialize body — attempt JSON, fall back to text
      let data: unknown;
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new ApiHttpError(response.status, response.statusText, data);
      }

      return data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // --------------------------------------------------------------------------
  // Public HTTP verb methods
  // --------------------------------------------------------------------------

  get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.dispatch<T>('GET', path, undefined, options);
  }

  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.dispatch<T>('POST', path, body, options);
  }

  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.dispatch<T>('PUT', path, body, options);
  }

  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.dispatch<T>('DELETE', path, undefined, options);
  }
}

// ============================================================================
// Response Types (domain-specific, kept from original)
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
// TiltCheck domain client (extends ApiClient)
// ============================================================================

/**
 * Domain-specific API client for TiltCheck.
 * Extends `ApiClient` and adds typed endpoint methods.
 *
 * Non-2xx responses throw `ApiHttpError`. Callers that want the
 * legacy `APIResult` envelope can use `safeCall()` or wrap calls
 * in try/catch.
 */
export class TiltCheckAPIClient extends ApiClient {
  constructor(config: APIClientConfig = {}) {
    super({
      baseURL: config.baseUrl ?? 'https://api.tiltcheck.me',
      credentials: config.credentials ?? 'include',
      headers: config.headers,
      timeout: config.timeout,
    });
  }

  // --------------------------------------------------------------------------
  // Auth Endpoints
  // --------------------------------------------------------------------------

  /** Get current user info from session */
  getMe(): Promise<MeResponse> {
    return this.get<MeResponse>('/auth/me');
  }

  /** Get Discord OAuth login URL */
  getDiscordLoginUrl(redirectUrl?: string): string {
    const params = new URLSearchParams();
    if (redirectUrl) {
      params.set('redirect', redirectUrl);
    }
    return `${this.baseURL}/auth/discord/login${params.toString() ? '?' + params.toString() : ''}`;
  }

  /** Logout current session */
  logout(): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>('/auth/logout');
  }

  // --------------------------------------------------------------------------
  // Tip Endpoints
  // --------------------------------------------------------------------------

  /** Verify a tip request */
  verifyTip(request: TipVerifyRequest): Promise<TipVerifyResponse> {
    return this.post<TipVerifyResponse>('/tip/verify', request);
  }

  /** Create a new tip */
  createTip(payload: CreateTipPayload): Promise<TipCreateResponse> {
    return this.post<TipCreateResponse>('/tip/create', payload);
  }

  /** Complete a tip with transaction signature */
  completeTip(tipId: string, txSignature: string): Promise<DBTip> {
    return this.post<DBTip>(`/tip/${tipId}/complete`, { txSignature });
  }

  /** Get tip by ID */
  getTip(tipId: string): Promise<{ tip: DBTip }> {
    return this.get<{ tip: DBTip }>(`/tip/${tipId}`);
  }

  // --------------------------------------------------------------------------
  // User Endpoints
  // --------------------------------------------------------------------------

  /** Get user by Discord ID */
  getUserByDiscordId(discordId: string): Promise<DBUser> {
    return this.get<DBUser>(`/users/discord/${discordId}`);
  }

  /** Link wallet to current user */
  linkWallet(walletAddress: string, signature: string, message: string): Promise<DBUser> {
    return this.post<DBUser>('/users/me/wallet', { walletAddress, signature, message });
  }

  // --------------------------------------------------------------------------
  // Health Endpoints
  // --------------------------------------------------------------------------

  /** Check API health */
  health(): Promise<{ status: string; service: string; version: string }> {
    return this.get('/health');
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Wrap an async call that may throw `ApiHttpError` into an `APIResult` envelope.
 * Useful for gradual migration from the old result-based API.
 *
 * @example
 * ```ts
 * const result = await safeCall(() => client.getMe());
 * if (result.success) console.log(result.data);
 * ```
 */
export async function safeCall<T>(fn: () => Promise<T>): Promise<APIResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiHttpError) {
      return {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.body,
        },
      };
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    const code =
      err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR';
    return { success: false, error: { code, message } };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a TiltCheck API client instance */
export function createAPIClient(config?: APIClientConfig): TiltCheckAPIClient {
  return new TiltCheckAPIClient(config);
}

let defaultClient: TiltCheckAPIClient | null = null;

/** Get the default (lazily-created) API client */
export function getAPIClient(): TiltCheckAPIClient {
  if (!defaultClient) {
    defaultClient = createAPIClient();
  }
  return defaultClient;
}

/** Override the default API client */
export function setDefaultAPIClient(client: TiltCheckAPIClient): void {
  defaultClient = client;
}

export default ApiClient;
