/**
 * Logflare Log Transport Integration
 * 
 * This module provides utilities for sending logs to Logflare or similar log aggregation services.
 * 
 * @example
 * ```typescript
 * import { sendToLogflare } from '@tiltcheck/monitoring/logflare';
 * 
 * // Send a log event
 * sendToLogflare({
 *   level: 'error',
 *   message: 'Something went wrong',
 *   service: 'discord-bot',
 *   userId: '12345',
 *   error: error.stack,
 * });
 * ```
 */

interface LogEvent {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  service: string;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Send a log event to Logflare
 * @param event - Log event object
 */
export async function sendToLogflare(event: LogEvent): Promise<void> {
  // TODO: Implement Logflare integration
  // - Check for process.env.LOGFLARE_API_KEY
  // - Check for process.env.LOGFLARE_SOURCE_ID
  // - POST to https://api.logflare.app/logs
  // - Add timestamp if not present
  // - Handle errors gracefully (don't crash on log failure)
  
  if (!process.env.LOGFLARE_API_KEY) {
    return;
  }

  const logEntry = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  console.log('[Logflare] Would send:', logEntry);
}

/**
 * Create a Logflare logger for a specific service
 * @param serviceName - Name of the service
 */
export function createLogflareLogger(serviceName: string) {
  return {
    debug: (message: string, meta?: Record<string, any>) => {
      sendToLogflare({ level: 'debug', message, service: serviceName, ...meta });
    },
    info: (message: string, meta?: Record<string, any>) => {
      sendToLogflare({ level: 'info', message, service: serviceName, ...meta });
    },
    warn: (message: string, meta?: Record<string, any>) => {
      sendToLogflare({ level: 'warn', message, service: serviceName, ...meta });
    },
    error: (message: string, meta?: Record<string, any>) => {
      sendToLogflare({ level: 'error', message, service: serviceName, ...meta });
    },
  };
}

/**
 * Batch log sender for efficient log aggregation
 */
export class BatchLogSender {
  private buffer: LogEvent[] = [];
  private batchSize: number;
  private flushInterval: number;
  private timer?: NodeJS.Timeout;

  constructor(batchSize = 10, flushIntervalMs = 5000) {
    this.batchSize = batchSize;
    this.flushInterval = flushIntervalMs;
    this.startTimer();
  }

  /**
   * Add a log event to the batch
   */
  add(event: LogEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush all buffered logs
   */
  async flush(): Promise<void> {
    // TODO: Implement batch log sending
    if (this.buffer.length === 0) {
      return;
    }

    console.log(`[Logflare] Flushing ${this.buffer.length} log events`);
    this.buffer = [];
  }

  /**
   * Start automatic flush timer
   */
  private startTimer(): void {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Stop automatic flush timer and cleanup
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.flush();
  }

  /**
   * Destructor for cleanup (call before process exit)
   */
  destroy(): void {
    this.stop();
  }
}
