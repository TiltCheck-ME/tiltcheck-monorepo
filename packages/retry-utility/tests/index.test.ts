/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry } from '../src/index';

describe('withRetry', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('should return the result if the function succeeds on the first try', async () => {
        const fn = vi.fn().mockResolvedValue('success');
        const result = await withRetry(fn);
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
        const fn = vi
            .fn()
            .mockRejectedValueOnce(new Error('fail 1'))
            .mockRejectedValueOnce(new Error('fail 2'))
            .mockResolvedValue('success');

        const promise = withRetry(fn, { initialDelay: 100 });
        await vi.runAllTimersAsync(); // first retry delay
        await vi.runAllTimersAsync(); // second retry delay
        const result = await promise;
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries are exhausted', async () => {
        const error = new Error('permanent failure');
        const fn = vi.fn().mockRejectedValue(error);
        const promise = withRetry(fn, { maxRetries: 2, initialDelay: 100 });
        await vi.runAllTimersAsync(); // first retry
        await vi.runAllTimersAsync(); // second retry
        await expect(promise).rejects.toThrow('permanent failure');
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry if retryCondition returns false', async () => {
        const error = new Error('do not retry');
        const fn = vi.fn().mockRejectedValue(error);
        const retryCondition = vi.fn().mockReturnValue(false);
        const promise = withRetry(fn, { retryCondition, maxRetries: 5 });
        await expect(promise).rejects.toThrow('do not retry');
        expect(fn).toHaveBeenCalledTimes(1);
        expect(retryCondition).toHaveBeenCalledWith(error);
    });

    it('should respect exponential backoff', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('fail'));
        const onRetry = vi.fn();
        const promise = withRetry(fn, {
            maxRetries: 2,
            initialDelay: 100,
            backoffFactor: 2,
            onRetry,
        });
        await vi.runAllTimersAsync(); // delay 100ms
        await vi.runAllTimersAsync(); // delay 200ms
        try {
            await promise;
        } catch (e) { }
        expect(onRetry).toHaveBeenCalledWith(expect.anything(), 1, 100);
        expect(onRetry).toHaveBeenCalledWith(expect.anything(), 2, 200);
    });

    it('should cap the delay at maxDelay', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('fail'));
        const onRetry = vi.fn();
        const promise = withRetry(fn, {
            maxRetries: 3,
            initialDelay: 1000,
            backoffFactor: 10,
            maxDelay: 5000,
            onRetry,
        });
        await vi.runAllTimersAsync(); // 1000ms
        await vi.runAllTimersAsync(); // capped to 5000ms
        await vi.runAllTimersAsync(); // still 5000ms
        try {
            await promise;
        } catch (e) { }
        expect(onRetry).toHaveBeenCalledWith(expect.anything(), 1, 1000);
        expect(onRetry).toHaveBeenCalledWith(expect.anything(), 2, 5000);
        expect(onRetry).toHaveBeenCalledWith(expect.anything(), 3, 5000);
    });
});
