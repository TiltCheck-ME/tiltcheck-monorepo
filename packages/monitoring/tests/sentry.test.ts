/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SentryMonitor } from '../src/sentry';
import * as Sentry from '@sentry/node';

// Mock the @sentry/node module
vi.mock('@sentry/node', () => {
    return {
        init: vi.fn(),
        captureException: vi.fn(),
        captureMessage: vi.fn(),
        setUser: vi.fn(),
        configureScope: vi.fn((cb) => cb({ setUser: vi.fn() })),
        setContext: vi.fn(),
        withScope: vi.fn((cb) => {
            const scope = { setExtra: vi.fn() } as any;
            cb(scope);
        }),
        Severity: { info: 'info', warning: 'warning', error: 'error' } as const,
    };
});

describe('SentryMonitor', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('initialises Sentry when DSN is provided', () => {
        const dsn = 'https://example@sentry.io/123';
        process.env.SENTRY_DSN = dsn;
        SentryMonitor.init('test-service');
        expect(Sentry.init).toHaveBeenCalledWith(
            expect.objectContaining({ dsn, serverName: 'test-service' })
        );
    });

    it('does not initialise Sentry without DSN', () => {
        delete process.env.SENTRY_DSN;
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });
        SentryMonitor.init('no-dsn-service');
        expect(Sentry.init).not.toHaveBeenCalled();
        expect(consoleWarn).toHaveBeenCalled();
        consoleWarn.mockRestore();
    });

    it('captures exception with context', () => {
        const error = new Error('boom');
        const context = { foo: 'bar' };
        SentryMonitor.captureException(error, context);
        expect(Sentry.withScope).toHaveBeenCalled();
        expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('captures message with default severity', () => {
        SentryMonitor.captureMessage('test message');
        expect(Sentry.captureMessage).toHaveBeenCalledWith('test message', 'info');
    });

    it('sets and clears user context', () => {
        SentryMonitor.setUser('user-123', { role: 'admin' });
        expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-123', role: 'admin' });

        SentryMonitor.clearUser();
        expect(Sentry.configureScope).toHaveBeenCalled();
    });

    it('sets arbitrary context', () => {
        SentryMonitor.setContext('myKey', { a: 1 });
        expect(Sentry.setContext).toHaveBeenCalledWith('myKey', { a: 1 });
    });
});

