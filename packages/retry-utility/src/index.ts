/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

/**
 * Configuration options for the retry utility
 */
export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Initial delay in milliseconds before the first retry (default: 500ms) */
    initialDelay?: number;
    /** Factor by which the delay increases each attempt (default: 2) */
    backoffFactor?: number;
    /** Maximum delay between retries in milliseconds (default: 30000ms) */
    maxDelay?: number;
    /**
     * Optional function to determine if a retry should be attempted based on the error.
     * Return true to retry, false to fail immediately.
     */
    retryCondition?: (error: any) => boolean;
    /** Optional callback triggered on each retry attempt */
    onRetry?: (error: any, attempt: number, delay: number) => void;
}

/**
 * Default options used when the caller does not provide them.
 */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryCondition' | 'onRetry'>> = {
    maxRetries: 3,
    initialDelay: 500,
    backoffFactor: 2,
    maxDelay: 30000,
};

/**
 * Simple sleep helper that returns a promise resolved after `ms` milliseconds.
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes an asynchronous function with exponential backoff retry logic.
 *
 * @param fn The asynchronous function to execute.
 * @param options Optional configuration to customise the retry behaviour.
 * @returns The resolved value of `fn` if it eventually succeeds.
 * @throws The last encountered error if all attempts fail.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const settings = { ...DEFAULT_OPTIONS, ...options };
    let lastError: any;
    let delay = settings.initialDelay;

    for (let attempt = 0; attempt <= settings.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            const shouldRetry =
                attempt < settings.maxRetries &&
                (!options.retryCondition || options.retryCondition(error));

            if (!shouldRetry) {
                throw lastError;
            }

            if (options.onRetry) {
                options.onRetry(error, attempt + 1, delay);
            }

            await sleep(delay);
            delay = Math.min(delay * settings.backoffFactor, settings.maxDelay);
        }
    }

    // Should never reach here because the loop either returns or throws.
    throw lastError;
}
