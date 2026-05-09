/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */

import { RuntimeLogger, createRuntimeLogger } from './logger.js';

export interface RuntimeStorageDriver {
  name: string;
  get<TValue>(key: string): Promise<TValue | undefined>;
  set<TValue>(key: string, value: TValue): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface SafeRuntimeStorageOptions {
  namespace?: string;
  drivers?: RuntimeStorageDriver[];
  logger?: RuntimeLogger;
}

export interface ChromeStorageDriverOptions {
  namespace?: string;
  area?: 'local' | 'sync' | 'session';
}

export interface LocalStorageDriverOptions {
  namespace?: string;
  storage?: Storage;
}

export interface MemoryStorageDriverOptions {
  namespace?: string;
}

const DEFAULT_NAMESPACE = 'tiltcheck.runtime';

type ChromeStorageCallback<TValue> = (value?: TValue) => void;

interface ChromeStorageAreaLike {
  get: (keys: string[] | string | null, callback?: ChromeStorageCallback<Record<string, unknown>>) => Promise<Record<string, unknown>> | void;
  set: (items: Record<string, unknown>, callback?: ChromeStorageCallback<void>) => Promise<void> | void;
  remove: (keys: string[] | string, callback?: ChromeStorageCallback<void>) => Promise<void> | void;
  clear: (callback?: ChromeStorageCallback<void>) => Promise<void> | void;
}

interface ChromeLike {
  runtime?: {
    lastError?: {
      message?: string;
    } | null;
  };
  storage?: Partial<Record<'local' | 'sync' | 'session', ChromeStorageAreaLike>>;
}

function namespacedKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

function readChromeStorageArea(area: 'local' | 'sync' | 'session'): ChromeStorageAreaLike | null {
  const chromeLike = (globalThis as typeof globalThis & { chrome?: ChromeLike }).chrome;
  return chromeLike?.storage?.[area] ?? null;
}

function readLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function getChromeLastError(): Error | null {
  const chromeLike = (globalThis as typeof globalThis & { chrome?: ChromeLike }).chrome;
  const message = chromeLike?.runtime?.lastError?.message;
  return message ? new Error(message) : null;
}

function invokeChromeStorage<TValue>(
  run: (done: ChromeStorageCallback<TValue>) => Promise<TValue> | void,
): Promise<TValue | undefined> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (value?: TValue) => {
      if (settled) {
        return;
      }

      settled = true;
      const lastError = getChromeLastError();
      if (lastError) {
        reject(lastError);
        return;
      }

      resolve(value);
    };

    try {
      const maybePromise = run(settle);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(settle).catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

export function createChromeStorageDriver(options: ChromeStorageDriverOptions = {}): RuntimeStorageDriver | null {
  const namespace = options.namespace ?? DEFAULT_NAMESPACE;
  const areaName = options.area ?? 'local';
  const area = readChromeStorageArea(areaName);

  if (!area) {
    return null;
  }

  return {
    name: `chrome.storage.${areaName}`,
    async get<TValue>(key: string): Promise<TValue | undefined> {
      const storageKey = namespacedKey(namespace, key);
      const result = await invokeChromeStorage<Record<string, unknown>>((done) => area.get([storageKey], done));
      return result?.[storageKey] as TValue | undefined;
    },
    async set<TValue>(key: string, value: TValue): Promise<void> {
      await invokeChromeStorage<void>((done) => area.set({ [namespacedKey(namespace, key)]: value }, done));
    },
    async remove(key: string): Promise<void> {
      await invokeChromeStorage<void>((done) => area.remove(namespacedKey(namespace, key), done));
    },
    async clear(): Promise<void> {
      const prefix = `${namespace}:`;
      const allValues = await invokeChromeStorage<Record<string, unknown>>((done) => area.get(null, done));
      const keysToRemove = Object.keys(allValues ?? {}).filter((key) => key.startsWith(prefix));

      if (keysToRemove.length > 0) {
        await invokeChromeStorage<void>((done) => area.remove(keysToRemove, done));
      }
    },
  };
}

export function createLocalStorageDriver(options: LocalStorageDriverOptions = {}): RuntimeStorageDriver | null {
  const namespace = options.namespace ?? DEFAULT_NAMESPACE;
  const storage = options.storage ?? readLocalStorage();

  if (!storage) {
    return null;
  }

  return {
    name: 'localStorage',
    async get<TValue>(key: string): Promise<TValue | undefined> {
      const rawValue = storage.getItem(namespacedKey(namespace, key));
      return rawValue === null ? undefined : JSON.parse(rawValue) as TValue;
    },
    async set<TValue>(key: string, value: TValue): Promise<void> {
      storage.setItem(namespacedKey(namespace, key), JSON.stringify(value));
    },
    async remove(key: string): Promise<void> {
      storage.removeItem(namespacedKey(namespace, key));
    },
    async clear(): Promise<void> {
      const prefix = `${namespace}:`;
      const keysToRemove: string[] = [];

      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        storage.removeItem(key);
      }
    },
  };
}

export function createMemoryStorageDriver(options: MemoryStorageDriverOptions = {}): RuntimeStorageDriver {
  const namespace = options.namespace ?? DEFAULT_NAMESPACE;
  const values = new Map<string, unknown>();

  return {
    name: 'memory',
    async get<TValue>(key: string): Promise<TValue | undefined> {
      return values.get(namespacedKey(namespace, key)) as TValue | undefined;
    },
    async set<TValue>(key: string, value: TValue): Promise<void> {
      values.set(namespacedKey(namespace, key), value);
    },
    async remove(key: string): Promise<void> {
      values.delete(namespacedKey(namespace, key));
    },
    async clear(): Promise<void> {
      const prefix = `${namespace}:`;

      for (const key of Array.from(values.keys())) {
        if (key.startsWith(prefix)) {
          values.delete(key);
        }
      }
    },
  };
}

export class SafeRuntimeStorage {
  private drivers: RuntimeStorageDriver[];
  private activeDriverIndex = 0;
  private logger: RuntimeLogger;

  constructor(options: SafeRuntimeStorageOptions = {}) {
    const namespace = options.namespace ?? DEFAULT_NAMESPACE;
    const drivers = options.drivers ?? [
      createChromeStorageDriver({ namespace }),
      createMemoryStorageDriver({ namespace }),
    ];

    this.drivers = drivers.filter((driver): driver is RuntimeStorageDriver => Boolean(driver));
    this.logger = options.logger ?? createRuntimeLogger({ namespace: 'TiltCheck:runtime:storage' });

    if (this.drivers.length === 0) {
      this.drivers = [createMemoryStorageDriver({ namespace })];
    }
  }

  public get activeDriverName(): string {
    return this.drivers[this.activeDriverIndex]?.name ?? 'unavailable';
  }

  public async get<TValue>(key: string, fallback?: TValue): Promise<TValue | undefined> {
    const value = await this.tryDrivers<TValue | undefined>(
      'get',
      (driver) => driver.get<TValue>(key),
      undefined,
    );

    return value === undefined ? fallback : value;
  }

  public async set<TValue>(key: string, value: TValue): Promise<void> {
    await this.tryDrivers<void>('set', (driver) => driver.set(key, value), undefined);
  }

  public async remove(key: string): Promise<void> {
    await this.tryDrivers<void>('remove', (driver) => driver.remove(key), undefined);
  }

  public async clear(): Promise<void> {
    await this.tryDrivers<void>('clear', (driver) => driver.clear(), undefined);
  }

  private async tryDrivers<TResult>(
    operation: string,
    run: (driver: RuntimeStorageDriver) => Promise<TResult>,
    fallback: TResult,
  ): Promise<TResult> {
    for (let index = this.activeDriverIndex; index < this.drivers.length; index += 1) {
      const driver = this.drivers[index];

      try {
        const result = await run(driver);
        this.activeDriverIndex = index;
        return result;
      } catch (error) {
        this.logger.warn(`Storage ${operation} failed on ${driver.name}; falling back`, error);
        this.activeDriverIndex = Math.min(index + 1, this.drivers.length - 1);
      }
    }

    this.logger.error(`Storage ${operation} failed on every driver`);
    return fallback;
  }
}

export function createSafeRuntimeStorage(options: SafeRuntimeStorageOptions = {}): SafeRuntimeStorage {
  return new SafeRuntimeStorage(options);
}
