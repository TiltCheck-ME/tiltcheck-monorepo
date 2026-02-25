/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Metrics Collection Utilities
 * 
 * This module provides utilities for collecting and reporting custom metrics using prom-client.
 */

import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

export class MetricsCollector {
  private registry: Registry;
  private serviceName: string;
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  constructor(serviceName?: string) {
    this.serviceName = serviceName || 'unknown';
    this.registry = new Registry();
    this.registry.setDefaultLabels({
      service: this.serviceName,
    });

    // Collect default metrics (cpu, memory, etc.)
    collectDefaultMetrics({ register: this.registry });
  }

  /**
   * Get or create a counter
   */
  private getCounter(name: string): Counter {
    const sanitizedName = name.replace(/\./g, '_');
    if (!this.counters.has(sanitizedName)) {
      const counter = new Counter({
        name: sanitizedName,
        help: `Counter for ${name}`,
        registers: [this.registry],
        labelNames: ['service'],
      });
      this.counters.set(sanitizedName, counter);
    }
    return this.counters.get(sanitizedName)!;
  }

  /**
   * Get or create a gauge
   */
  private getGauge(name: string): Gauge {
    const sanitizedName = name.replace(/\./g, '_');
    if (!this.gauges.has(sanitizedName)) {
      const gauge = new Gauge({
        name: sanitizedName,
        help: `Gauge for ${name}`,
        registers: [this.registry],
        labelNames: ['service'],
      });
      this.gauges.set(sanitizedName, gauge);
    }
    return this.gauges.get(sanitizedName)!;
  }

  /**
   * Get or create a histogram for timings
   */
  private getHistogram(name: string): Histogram {
    const sanitizedName = name.replace(/\./g, '_');
    if (!this.histograms.has(sanitizedName)) {
      const histogram = new Histogram({
        name: sanitizedName,
        help: `Histogram for ${name}`,
        registers: [this.registry],
        labelNames: ['service'],
        buckets: [0.1, 5, 15, 50, 100, 500, 1000, 2000, 5000], // default buckets in ms
      });
      this.histograms.set(sanitizedName, histogram);
    }
    return this.histograms.get(sanitizedName)!;
  }

  /**
   * Increment a counter metric
   * @param metric - Metric name (e.g., 'commands.executed')
   * @param value - Amount to increment (default: 1)
   */
  increment(metric: string, value = 1): void {
    this.getCounter(metric).inc({ service: this.serviceName }, value);
  }

  /**
   * Set a gauge value
   * @param metric - Metric name (e.g., 'memory.usage')
   * @param value - Value to set
   */
  gauge(metric: string, value: number): void {
    this.getGauge(metric).set({ service: this.serviceName }, value);
  }

  /**
   * Record a timing/duration
   * @param metric - Metric name (e.g., 'command.latency')
   * @param duration - Duration in milliseconds
   */
  timing(metric: string, duration: number): void {
    this.getHistogram(metric).observe({ service: this.serviceName }, duration);
  }

  /**
   * Flush metrics to endpoint
   * Sends all collected metrics as Prometheus formatted text
   */
  async flush(): Promise<void> {
    const endpoint = process.env.METRICS_ENDPOINT;
    if (!endpoint) {
      if (process.env.NODE_ENV === 'development') {
        process.stdout.write(`[Metrics] Would flush to endpoint if configured\n`);
      }
      return;
    }

    try {
      const metrics = await this.registry.metrics();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain; version=0.0.4',
        },
        body: metrics,
      });

      if (!response.ok) {
        throw new Error(`Failed to flush metrics: ${response.statusText}`);
      }

      this.registry.clear();
      this.counters.clear();
      this.gauges.clear();
      this.histograms.clear();
      collectDefaultMetrics({ register: this.registry });
    } catch (error) {
      console.error('[Metrics] Error flushing metrics:', error);
    }
  }

  /**
   * Get current metrics snapshot in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Get the registry instance
   */
  getRegistry(): Registry {
    return this.registry;
  }
}

/**
 * Create a metrics collector for a service
 * @param serviceName - Name of the service
 */
export function createMetricsCollector(serviceName: string): MetricsCollector {
  return new MetricsCollector(serviceName);
}
