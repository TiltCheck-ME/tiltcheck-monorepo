/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */

export type RuntimeLogLevel = 'info' | 'warn' | 'error';

export interface RuntimeLogSink {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface RuntimeLoggerOptions {
  namespace?: string;
  minLevel?: RuntimeLogLevel;
  enabled?: boolean;
  sink?: RuntimeLogSink;
}

const LEVEL_PRIORITY: Record<RuntimeLogLevel, number> = {
  info: 10,
  warn: 20,
  error: 30,
};

const DEFAULT_NAMESPACE = 'TiltCheck';

function resolveConsoleSink(): RuntimeLogSink {
  const fallback = () => undefined;
  const consoleLike = globalThis.console;

  return {
    info: consoleLike?.info?.bind(consoleLike) ?? consoleLike?.log?.bind(consoleLike) ?? fallback,
    warn: consoleLike?.warn?.bind(consoleLike) ?? consoleLike?.log?.bind(consoleLike) ?? fallback,
    error: consoleLike?.error?.bind(consoleLike) ?? consoleLike?.log?.bind(consoleLike) ?? fallback,
  };
}

export class RuntimeLogger {
  private namespace: string;
  private minLevel: RuntimeLogLevel;
  private enabled: boolean;
  private sink: RuntimeLogSink;

  constructor(options: RuntimeLoggerOptions = {}) {
    this.namespace = options.namespace ?? DEFAULT_NAMESPACE;
    this.minLevel = options.minLevel ?? 'info';
    this.enabled = options.enabled ?? true;
    this.sink = options.sink ?? resolveConsoleSink();
  }

  public child(scope: string): RuntimeLogger {
    return new RuntimeLogger({
      namespace: `${this.namespace}:${scope}`,
      minLevel: this.minLevel,
      enabled: this.enabled,
      sink: this.sink,
    });
  }

  public setLevel(level: RuntimeLogLevel): void {
    this.minLevel = level;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public info(message: string, ...meta: unknown[]): void {
    this.write('info', message, meta);
  }

  public warn(message: string, ...meta: unknown[]): void {
    this.write('warn', message, meta);
  }

  public error(message: string, ...meta: unknown[]): void {
    this.write('error', message, meta);
  }

  private write(level: RuntimeLogLevel, message: string, meta: unknown[]): void {
    if (!this.enabled || LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    this.sink[level](`[${this.namespace}] ${message}`, ...meta);
  }
}

export function createRuntimeLogger(options: RuntimeLoggerOptions = {}): RuntimeLogger {
  return new RuntimeLogger(options);
}
