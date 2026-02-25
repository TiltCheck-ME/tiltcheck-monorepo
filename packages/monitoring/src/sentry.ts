/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Sentry Error Tracking Integration
 * 
 * This module provides Sentry initialization and error capture utilities.
 * Services should call initSentry() at startup with their service name.
 * 
 * @example
 * ```typescript
 * import { initSentry, captureException } from '@tiltcheck/monitoring/sentry';
 * 
 * // In your service's index.ts
 * initSentry('discord-bot');
 * 
 * // When catching errors
 * try {
 *   // ... code
 * } catch (error) {
 *   captureException(error, {
 *     user: userId,
 *     command: commandName,
 *   });
 *   throw error;
 * }
 * ```
 */

/**
 * Initialize Sentry for error tracking
 * @param serviceName - Name of the service (e.g., 'discord-bot', 'api-gateway')
 */
import * as Sentry from '@sentry/node';

/**
 * Sentry error tracking provider.
 * Provides static methods to initialise Sentry and capture errors / messages.
 */
export class SentryMonitor {
  /** Initialise Sentry for a given service.
   * @param serviceName Name of the service (used as serverName)
   * @param dsn Optional DSN; if omitted, reads from process.env.SENTRY_DSN
   */
  static init(serviceName: string, dsn?: string): void {
    const resolvedDsn = dsn ?? process.env.SENTRY_DSN;
    if (!resolvedDsn) {
      console.warn('[Sentry] DSN not provided – Sentry is disabled');
      return;
    }
    Sentry.init({
      dsn: resolvedDsn,
      environment: process.env.NODE_ENV ?? 'development',
      serverName: serviceName,
      tracesSampleRate: 1.0,
    });
  }

  /** Capture an exception with optional extra context. */
  static captureException(error: unknown, context?: Record<string, any>): void {
    Sentry.withScope((scope) => {
      if (context) {
        for (const [key, value] of Object.entries(context)) {
          scope.setExtra(key, value);
        }
      }
      Sentry.captureException(error);
    });
  }

  /** Capture a message with a given severity level. */
  static captureMessage(message: string, level: Sentry.Severity = 'info' as Sentry.Severity): void {
    Sentry.captureMessage(message, level);
  }

  /** Set user context for subsequent events. */
  static setUser(userId: string, additional?: Record<string, any>): void {
    Sentry.setUser({ id: userId, ...additional });
  }

  /** Clear any previously set user context. */
  static clearUser(): void {
    Sentry.configureScope((scope) => scope.setUser(null));
  }

  /** Set arbitrary context data. */
  static setContext(key: string, value: any): void {
    Sentry.setContext(key, value);
  }
}

