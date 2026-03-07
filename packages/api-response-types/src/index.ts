/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

/**
 * Standardized API Response Types
 * These interfaces define the shape of all @tiltcheck API responses.
 * They are used by edge workers, backend services, and frontend applications.
 */

/**
 * Base properties shared by all responses
 */
export interface BaseResponse {
    status: 'ok' | 'error';
    timestamp: number;
    requestId?: string;
}

/**
 * Interface for a successful API response
 */
export interface SuccessResponse<T> extends BaseResponse {
    status: 'ok';
    data: T;
    message?: string;
}

/**
 * Interface for an error API response
 */
export interface ErrorResponse extends BaseResponse {
    status: 'error';
    error: string;           // Human readable error message
    code?: string;           // Machine readable error code (e.g. 'UNAUTHORIZED')
    details?: any;           // Additional error context
}

/**
 * Metadata for paginated responses
 */
export interface PaginationMetadata {
    total: number;           // Total number of items across all pages
    limit: number;           // Number of items per page
    offset: number;          // Starting index of the current page
    hasMore: boolean;        // Whether there are more items to fetch
    nextOffset?: number;     // Suggested offset for next page
}

/**
 * Interface for a paginated successful API response
 */
export interface PaginatedResponse<T> extends BaseResponse {
    status: 'ok';
    data: T[];
    pagination: PaginationMetadata;
}

/**
 * Unified API Response type for convenience
 */
export type APIResponse<T> = SuccessResponse<T> | ErrorResponse | PaginatedResponse<T>;
