/**
 * @tiltcheck/logger
 * 
 * Structured logging for the TiltCheck ecosystem using pino.
 * Provides consistent, environment-aware logging across all services.
 */

import pino, { Logger, LoggerOptions } from 'pino';

// ============================================================================
// Types
// ============================================================================

export interface LoggerConfig {
  /** Service/app name for log context */
  name: string;
  /** Log level (default: based on NODE_ENV) */
  level?: string;
  /** Enable pretty printing (default: true in development) */
  pretty?: boolean;
  /** Additional base context */
  base?: Record<string, unknown>;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// ============================================================================
// Logger Factory
// ============================================================================

/**
 * Create a configured pino logger instance
 */
export function createLogger(config: LoggerConfig): Logger {
  const isDev = process.env.NODE_ENV !== 'production';
  const level = config.level || (isDev ? 'debug' : 'info');
  const pretty = config.pretty ?? isDev;

  const options: LoggerOptions = {
    name: config.name,
    level,
    base: {
      service: config.name,
      env: process.env.NODE_ENV || 'development',
      ...config.base,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  // Use pino-pretty transport in development
  if (pretty) {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  // JSON logging for production
  return pino(options);
}

// ============================================================================
// Default Logger
// ============================================================================

let defaultLogger: Logger | null = null;

/**
 * Get the default logger instance
 * Creates one with 'tiltcheck' name if not already created
 */
export function getLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger({ name: 'tiltcheck' });
  }
  return defaultLogger;
}

/**
 * Set the default logger instance
 */
export function setDefaultLogger(logger: Logger): void {
  defaultLogger = logger;
}

// ============================================================================
// Child Logger Factory
// ============================================================================

/**
 * Create a child logger with additional context
 */
export function createChildLogger(
  parent: Logger,
  context: Record<string, unknown>
): Logger {
  return parent.child(context);
}

/**
 * Create a request-scoped logger with request ID
 */
export function createRequestLogger(
  parent: Logger,
  requestId: string,
  additionalContext?: Record<string, unknown>
): Logger {
  return parent.child({
    requestId,
    ...additionalContext,
  });
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Log at info level using default logger
 */
export function info(msg: string, data?: Record<string, unknown>): void {
  const logger = getLogger();
  if (data) {
    logger.info(data, msg);
  } else {
    logger.info(msg);
  }
}

/**
 * Log at debug level using default logger
 */
export function debug(msg: string, data?: Record<string, unknown>): void {
  const logger = getLogger();
  if (data) {
    logger.debug(data, msg);
  } else {
    logger.debug(msg);
  }
}

/**
 * Log at warn level using default logger
 */
export function warn(msg: string, data?: Record<string, unknown>): void {
  const logger = getLogger();
  if (data) {
    logger.warn(data, msg);
  } else {
    logger.warn(msg);
  }
}

/**
 * Log at error level using default logger
 */
export function error(msg: string, err?: Error | Record<string, unknown>): void {
  const logger = getLogger();
  if (err instanceof Error) {
    logger.error({ err }, msg);
  } else if (err) {
    logger.error(err, msg);
  } else {
    logger.error(msg);
  }
}

/**
 * Log at fatal level using default logger
 */
export function fatal(msg: string, err?: Error | Record<string, unknown>): void {
  const logger = getLogger();
  if (err instanceof Error) {
    logger.fatal({ err }, msg);
  } else if (err) {
    logger.fatal(err, msg);
  } else {
    logger.fatal(msg);
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export { Logger } from 'pino';
export default getLogger;
