/**
 * Metrics Collection Utilities
 * 
 * This module provides utilities for collecting and reporting custom metrics.
 * 
 * @example
 * ```typescript
 * import { MetricsCollector } from '@tiltcheck/monitoring/metrics';
 * 
 * const metrics = new MetricsCollector();
 * 
 * // Increment a counter
 * metrics.increment('commands.executed');
 * metrics.increment('errors.rate', 1);
 * 
 * // Set a gauge value
 * metrics.gauge('memory.usage', process.memoryUsage().heapUsed);
 * 
 * // Flush metrics (call periodically)
 * await metrics.flush();
 * ```
 */

export class MetricsCollector {
  private metrics: Map<string, number> = new Map();
  private serviceName: string;

  constructor(serviceName?: string) {
    this.serviceName = serviceName || 'unknown';
  }

  /**
   * Increment a counter metric
   * @param metric - Metric name (e.g., 'commands.executed')
   * @param value - Amount to increment (default: 1)
   */
  increment(metric: string, value = 1): void {
    // TODO: Implement metric increment
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  /**
   * Set a gauge value
   * @param metric - Metric name (e.g., 'memory.usage')
   * @param value - Value to set
   */
  gauge(metric: string, value: number): void {
    // TODO: Implement gauge metric
    this.metrics.set(metric, value);
  }

  /**
   * Record a timing/duration
   * @param metric - Metric name (e.g., 'command.latency')
   * @param duration - Duration in milliseconds
   */
  timing(metric: string, duration: number): void {
    // TODO: Implement timing metric
    this.metrics.set(`${metric}.duration`, duration);
  }

  /**
   * Flush metrics to endpoint
   * Sends all collected metrics and clears the buffer
   */
  async flush(): Promise<void> {
    // TODO: Implement metrics flushing
    // - Send to process.env.METRICS_ENDPOINT
    // - Include service name in payload
    // - Clear metrics map after successful send
    
    if (this.metrics.size === 0) {
      return;
    }

    console.log('[Metrics] Flushing metrics:', Object.fromEntries(this.metrics));
    this.metrics.clear();
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}

/**
 * Create a metrics collector for a service
 * @param serviceName - Name of the service
 */
export function createMetricsCollector(serviceName: string): MetricsCollector {
  return new MetricsCollector(serviceName);
}
