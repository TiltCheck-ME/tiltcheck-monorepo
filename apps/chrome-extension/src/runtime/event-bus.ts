/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */

import { RuntimeLogger, createRuntimeLogger } from './logger.js';

type RuntimeEventName<TEvents extends object> = Extract<keyof TEvents, string>;

export type RuntimeEventHandler<TPayload> = (payload: TPayload) => void | Promise<void>;

export interface RuntimeEventBusOptions {
  logger?: RuntimeLogger;
}

export class RuntimeEventBus<TEvents extends object = Record<string, unknown>> {
  private handlers = new Map<RuntimeEventName<TEvents>, Set<RuntimeEventHandler<TEvents[RuntimeEventName<TEvents>]>>>();
  private logger: RuntimeLogger;

  constructor(options: RuntimeEventBusOptions = {}) {
    this.logger = options.logger ?? createRuntimeLogger({ namespace: 'TiltCheck:runtime:events' });
  }

  public on<K extends RuntimeEventName<TEvents>>(eventName: K, handler: RuntimeEventHandler<TEvents[K]>): () => void {
    const handlers = this.handlers.get(eventName) ?? new Set();
    handlers.add(handler as RuntimeEventHandler<TEvents[RuntimeEventName<TEvents>]>);
    this.handlers.set(eventName, handlers);

    return () => this.off(eventName, handler);
  }

  public once<K extends RuntimeEventName<TEvents>>(eventName: K, handler: RuntimeEventHandler<TEvents[K]>): () => void {
    const unsubscribe = this.on(eventName, async (payload) => {
      unsubscribe();
      await handler(payload);
    });

    return unsubscribe;
  }

  public off<K extends RuntimeEventName<TEvents>>(eventName: K, handler: RuntimeEventHandler<TEvents[K]>): void {
    const handlers = this.handlers.get(eventName);
    handlers?.delete(handler as RuntimeEventHandler<TEvents[RuntimeEventName<TEvents>]>);

    if (handlers?.size === 0) {
      this.handlers.delete(eventName);
    }
  }

  public async emit<K extends RuntimeEventName<TEvents>>(eventName: K, payload: TEvents[K]): Promise<void> {
    const handlers = Array.from(this.handlers.get(eventName) ?? []);

    await Promise.all(handlers.map(async (handler) => {
      try {
        await handler(payload as TEvents[RuntimeEventName<TEvents>]);
      } catch (error) {
        this.logger.error(`Event handler failed for ${eventName}`, error);
      }
    }));
  }

  public listenerCount<K extends RuntimeEventName<TEvents>>(eventName: K): number {
    return this.handlers.get(eventName)?.size ?? 0;
  }

  public clear<K extends RuntimeEventName<TEvents>>(eventName?: K): void {
    if (eventName) {
      this.handlers.delete(eventName);
      return;
    }

    this.handlers.clear();
  }
}

export function createRuntimeEventBus<TEvents extends object = Record<string, unknown>>(
  options: RuntimeEventBusOptions = {},
): RuntimeEventBus<TEvents> {
  return new RuntimeEventBus<TEvents>(options);
}
