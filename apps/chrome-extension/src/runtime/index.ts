/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */

import { RuntimeEventBus, createRuntimeEventBus } from './event-bus.js';
import { FeatureFlagChange, FeatureFlagDefaults, FeatureFlagRegistry, createFeatureFlagRegistry } from './feature-flags.js';
import { RuntimeLogger, RuntimeLoggerOptions, createRuntimeLogger } from './logger.js';
import { SafeRuntimeStorage, createSafeRuntimeStorage } from './storage.js';

export interface InjectedRuntimeEvents<TFlag extends string = string> {
  'feature-flags:changed': FeatureFlagChange<TFlag>;
}

export interface InjectedRuntimeCore<TFlag extends string = string> {
  logger: RuntimeLogger;
  events: RuntimeEventBus<InjectedRuntimeEvents<TFlag>>;
  flags: FeatureFlagRegistry<TFlag>;
  storage: SafeRuntimeStorage;
}

export interface InjectedRuntimeCoreOptions<TFlag extends string = string> {
  namespace?: string;
  logger?: RuntimeLogger;
  loggerOptions?: RuntimeLoggerOptions;
  events?: RuntimeEventBus<InjectedRuntimeEvents<TFlag>>;
  flags?: FeatureFlagRegistry<TFlag>;
  storage?: SafeRuntimeStorage;
  defaultFlags?: FeatureFlagDefaults<TFlag>;
}

export function createInjectedRuntimeCore<TFlag extends string = string>(
  options: InjectedRuntimeCoreOptions<TFlag> = {},
): InjectedRuntimeCore<TFlag> {
  const namespace = options.namespace ?? 'TiltCheck:runtime';
  const logger = options.logger ?? createRuntimeLogger({
    namespace,
    ...options.loggerOptions,
  });
  const events = options.events ?? createRuntimeEventBus<InjectedRuntimeEvents<TFlag>>({
    logger: logger.child('events'),
  });
  const flags = options.flags ?? createFeatureFlagRegistry<TFlag>({
    defaults: options.defaultFlags,
    logger: logger.child('flags'),
    onChange: (change) => {
      void events.emit('feature-flags:changed', change);
    },
  });
  const storage = options.storage ?? createSafeRuntimeStorage({
    namespace: options.namespace ?? 'tiltcheck.runtime',
    logger: logger.child('storage'),
  });

  return {
    logger,
    events,
    flags,
    storage,
  };
}

export { RuntimeEventBus, createRuntimeEventBus } from './event-bus.js';
export type { RuntimeEventBusOptions, RuntimeEventHandler } from './event-bus.js';
export { FeatureFlagRegistry, createFeatureFlagRegistry } from './feature-flags.js';
export type {
  FeatureFlagChange,
  FeatureFlagDefaults,
  FeatureFlagDefinition,
  FeatureFlagInput,
  FeatureFlagRegistryOptions,
  FeatureFlagSource,
} from './feature-flags.js';
export { RuntimeLogger, createRuntimeLogger } from './logger.js';
export type { RuntimeLoggerOptions, RuntimeLogLevel, RuntimeLogSink } from './logger.js';
export {
  SafeRuntimeStorage,
  createChromeStorageDriver,
  createLocalStorageDriver,
  createMemoryStorageDriver,
  createSafeRuntimeStorage,
} from './storage.js';
export type {
  ChromeStorageDriverOptions,
  LocalStorageDriverOptions,
  MemoryStorageDriverOptions,
  RuntimeStorageDriver,
  SafeRuntimeStorageOptions,
} from './storage.js';
