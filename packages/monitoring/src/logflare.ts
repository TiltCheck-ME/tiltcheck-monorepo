/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
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

export interface LogEvent {
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
  const apiKey = process.env.LOGFLARE_API_KEY;
  const sourceId = process.env.LOGFLARE_SOURCE_ID;
  if (!apiKey) {
    // Silently ignore if no API key is configured.
    return;
  }

  const logEntry = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  const payload = sourceId ? { source: sourceId, logs: [logEntry] } : { logs: [logEntry] };

  try {
    await fetch('https://api.logflare.app/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Logflare failures should not crash the application.
    console.error('[Logflare] Failed to send log:', err);
  }
}

// Legacy placeholder removed – functionality now provided by BatchLogSender and sendToLogflare.


/**
 * Create a Logflare logger for a specific service
 * @param serviceName - Name of the service
 */
export function createLogflareLogger(serviceName: string) {
  return {
    debug: async (message: string, meta?: Record<string, any>) => {
      await sendToLogflare({ level: 'debug', message, service: serviceName, ...meta });
    },
    info: async (message: string, meta?: Record<string, any>) => {
      await sendToLogflare({ level: 'info', message, service: serviceName, ...meta });
    },
    warn: async (message: string, meta?: Record<string, any>) => {
      await sendToLogflare({ level: 'warn', message, service: serviceName, ...meta });
    },
    error: async (message: string, meta?: Record<string, any>) => {
      await sendToLogflare({ level: 'error', message, service: serviceName, ...meta });
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
    if (this.buffer.length === 0) {
      return;
    }

    const apiKey = process.env.LOGFLARE_API_KEY;
    const sourceId = process.env.LOGFLARE_SOURCE_ID;
    if (!apiKey) {
      // No API key, drop logs silently.
      this.buffer = [];
      return;
    }

    const payload = sourceId ? { source: sourceId, logs: this.buffer } : { logs: this.buffer };
    try {
      await fetch('https://api.logflare.app/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('[Logflare] Failed to flush logs:', err);
    }
    // Clear buffer after attempt
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
