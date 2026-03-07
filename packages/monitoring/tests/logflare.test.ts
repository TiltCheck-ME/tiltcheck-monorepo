import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendToLogflare, BatchLogSender, LogEvent } from '../src/logflare.js';

// Mock fetch globally
const mockFetch = vi.fn();

beforeEach(() => {
    // Reset environment variables
    delete process.env.LOGFLARE_API_KEY;
    delete process.env.LOGFLARE_SOURCE_ID;
    // Mock global fetch
    // @ts-ignore
    global.fetch = mockFetch;
    mockFetch.mockReset();
});

afterEach(() => {
    // Clean up mock
    // @ts-ignore
    delete global.fetch;
});

describe('sendToLogflare', () => {
    it('sends log when API key is present', async () => {
        process.env.LOGFLARE_API_KEY = 'test-key';
        process.env.LOGFLARE_SOURCE_ID = 'source-123';
        const event: LogEvent = {
            level: 'info',
            message: 'test message',
            service: 'unit-test',
        };
        await sendToLogflare(event);
        expect(mockFetch).toHaveBeenCalledOnce();
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toBe('https://api.logflare.app/logs');
        expect(options?.method).toBe('POST');
        expect(options?.headers).toEqual({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
        });
        const body = JSON.parse(options?.body as string);
        expect(body).toEqual({
            source: 'source-123',
            logs: [expect.objectContaining({
                level: 'info',
                message: 'test message',
                service: 'unit-test',
                timestamp: expect.any(String),
            })],
        });
    });

    it('does not call fetch when API key is missing', async () => {
        const event: LogEvent = {
            level: 'error',
            message: 'no key',
            service: 'unit-test',
        };
        await sendToLogflare(event);
        expect(mockFetch).not.toHaveBeenCalled();
    });
});

describe('BatchLogSender', () => {
    it('flushes logs in batches', async () => {
        process.env.LOGFLARE_API_KEY = 'batch-key';
        const sender = new BatchLogSender(2, 10000); // batch size 2
        const event1: LogEvent = { level: 'debug', message: 'first', service: 'batch' };
        const event2: LogEvent = { level: 'debug', message: 'second', service: 'batch' };
        sender.add(event1);
        sender.add(event2);
        // flush should have been triggered automatically when batch size reached
        expect(mockFetch).toHaveBeenCalledOnce();
        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.logs).toHaveLength(2);
        // Clean up timer
        sender.stop();
    });
});
