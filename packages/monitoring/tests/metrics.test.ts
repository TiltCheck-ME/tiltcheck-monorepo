/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsCollector } from '../src/metrics.js';

describe('MetricsCollector', () => {
    let metrics: MetricsCollector;

    beforeEach(() => {
        metrics = new MetricsCollector('test-service');
    });

    it('should increment a counter', async () => {
        metrics.increment('test_counter', 5);
        const result = await metrics.getMetrics();
        expect(result).toContain('test_counter');
        expect(result).toContain('5');
    });

    it('should set a gauge', async () => {
        metrics.gauge('test_gauge', 42);
        const result = await metrics.getMetrics();
        expect(result).toContain('test_gauge');
        expect(result).toContain('42');
    });

    it('should record timings', async () => {
        metrics.timing('test_timing', 150);
        const result = await metrics.getMetrics();
        expect(result).toContain('test_timing');
        // Histograms have count, sum, and buckets
        expect(result).toContain('test_timing_count');
        expect(result).toContain('test_timing_sum');
    });

    it('should include service label', async () => {
        metrics.increment('test_labeled');
        const result = await metrics.getMetrics();
        expect(result).toContain('service="test-service"');
    });

    it('should flush to endpoint if configured', async () => {
        process.env.METRICS_ENDPOINT = 'http://localhost:9090/push';
        const mockResponse = { ok: true };
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse as Response);

        metrics.increment('test_flush');
        await metrics.flush();

        expect(fetchSpy).toHaveBeenCalledWith(
            'http://localhost:9090/push',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'text/plain; version=0.0.4' },
            })
        );

        delete process.env.METRICS_ENDPOINT;
    });

    it('should clear metrics after successful flush', async () => {
        process.env.METRICS_ENDPOINT = 'http://localhost:9090/push';
        vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

        metrics.increment('test_clear', 1);
        await metrics.flush();

        const result = await metrics.getMetrics();
        // After flush, test_clear should be gone because we clear registry
        expect(result).not.toContain('test_clear');

        delete process.env.METRICS_ENDPOINT;
    });
});
