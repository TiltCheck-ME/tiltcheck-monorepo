/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/monitoring
 * 
 * Unified monitoring, error tracking, and logging utilities for TiltCheck services.
 * 
 * This package provides:
 * - Sentry error tracking integration
 * - Custom metrics collection
 * - Logflare log aggregation
 * - Correlation ID middleware for request tracing
 * 
 * @example Basic Usage
 * ```typescript
 * import { initSentry, captureException } from '@tiltcheck/monitoring';
 * import { MetricsCollector } from '@tiltcheck/monitoring/metrics';
 * 
 * // Initialize monitoring for your service
 * initSentry('my-service');
 * 
 * const metrics = new MetricsCollector('my-service');
 * 
 * try {
 *   // Your code
 *   metrics.increment('operations.success');
 * } catch (error) {
 *   captureException(error, { operation: 'example' });
 *   metrics.increment('operations.failure');
 * }
 * ```
 */

// Re-export all monitoring utilities
export * from './sentry.js';
export * from './metrics.js';
export * from './logflare.js';
export * from './correlation-id.js';
