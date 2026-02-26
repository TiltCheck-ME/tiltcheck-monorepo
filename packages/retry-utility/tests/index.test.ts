/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../src/index';

describe('withRetry', () => {
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

        const result = await withRetry(fn, { initialDelay: 5 });
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries are exhausted', async () => {
        const error = new Error('permanent failure');
        const fn = vi.fn().mockRejectedValue(error);
        await expect(withRetry(fn, { maxRetries: 2, initialDelay: 5 })).rejects.toThrow('permanent failure');
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
        try {
            await withRetry(fn, {
                maxRetries: 2,
                initialDelay: 10,
                backoffFactor: 2,
                onRetry,
            });
        } catch (e) { }
        expect(onRetry).toHaveBeenCalledWith(expect.anything(), 1, 10);
        expect(onRetry).toHaveBeenCalledWith(expect.anything(), 2, 20);
    });

    it('should cap the delay at maxDelay', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('fail'));
        const onRetry = vi.fn();
        try {
            await withRetry(fn, {
                maxRetries: 3,
                initialDelay: 10,
                backoffFactor: 10,
                maxDelay: 50,
                onRetry,
            });
        } catch (e) { }
        expect(onRetry).toHaveBeenCalledWith(expect.anything(), 1, 10);
        expect(onRetry).toHaveBeenCalledWith(expect.anything(), 2, 50);
        expect(onRetry).toHaveBeenCalledWith(expect.anything(), 3, 50);
    });
});
