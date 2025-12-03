/**
 * @tiltcheck/utils - API Response Helpers
 * Standardized API response formatting
 */

// ============================================================================
// Types
// ============================================================================

export interface SuccessResponse<T = unknown> {
  status: 'ok';
  data: T;
  meta?: ResponseMeta;
}

export interface ErrorResponse {
  status: 'error';
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ResponseMeta {
  requestId?: string;
  timestamp?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type APIResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// ============================================================================
// Response Builders
// ============================================================================

/**
 * Create a success response
 */
export function success<T>(data: T, meta?: ResponseMeta): SuccessResponse<T> {
  return {
    status: 'ok',
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create an error response
 */
export function error(code: string, message: string, details?: unknown): ErrorResponse {
  return {
    status: 'error',
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Create a paginated response
 */
export function paginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  meta?: Omit<ResponseMeta, 'pagination'>
): SuccessResponse<T[]> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    status: 'ok',
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  };
}

// ============================================================================
// Response Utilities
// ============================================================================

/**
 * Check if response is a success
 */
export function isSuccess<T>(response: APIResponse<T>): response is SuccessResponse<T> {
  return response.status === 'ok';
}

/**
 * Check if response is an error
 */
export function isError(response: APIResponse): response is ErrorResponse {
  return response.status === 'error';
}

/**
 * Unwrap a response, throwing if error
 */
export function unwrap<T>(response: APIResponse<T>): T {
  if (isError(response)) {
    throw new Error(`API Error: ${response.error.code} - ${response.error.message}`);
  }
  return response.data;
}

/**
 * Create a response with request ID
 */
export function withRequestId<T>(response: SuccessResponse<T>, requestId: string): SuccessResponse<T> {
  return {
    ...response,
    meta: {
      ...response.meta,
      requestId,
    },
  };
}

// ============================================================================
// HTTP Status Helpers
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Get HTTP status code from error code
 */
export function getStatusFromCode(code: string): number {
  const statusMap: Record<string, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    RATE_LIMIT_EXCEEDED: 429,
    SERVICE_ERROR: 503,
    TOKEN_EXPIRED: 401,
    TOKEN_INVALID: 401,
  };
  
  return statusMap[code] || 500;
}
