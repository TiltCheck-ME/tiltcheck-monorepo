/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */

import { RuntimeLogger, createRuntimeLogger } from './logger.js';

export type FeatureFlagSource = 'default' | 'runtime';

export interface FeatureFlagDefinition {
  enabled: boolean;
  description?: string;
}

export type FeatureFlagInput = boolean | FeatureFlagDefinition;

export type FeatureFlagDefaults<TFlag extends string = string> = Partial<Record<TFlag, FeatureFlagInput>>;

export interface FeatureFlagChange<TFlag extends string = string> {
  name: TFlag;
  enabled: boolean;
  previous: boolean;
  source: FeatureFlagSource;
}

export interface FeatureFlagRegistryOptions<TFlag extends string = string> {
  defaults?: FeatureFlagDefaults<TFlag>;
  logger?: RuntimeLogger;
  onChange?: (change: FeatureFlagChange<TFlag>) => void;
}

type StoredFeatureFlag = FeatureFlagDefinition & {
  source: FeatureFlagSource;
};

export class FeatureFlagRegistry<TFlag extends string = string> {
  private flags = new Map<TFlag, StoredFeatureFlag>();
  private listeners = new Set<(change: FeatureFlagChange<TFlag>) => void>();
  private logger: RuntimeLogger;

  constructor(options: FeatureFlagRegistryOptions<TFlag> = {}) {
    this.logger = options.logger ?? createRuntimeLogger({ namespace: 'TiltCheck:runtime:flags' });

    if (options.onChange) {
      this.listeners.add(options.onChange);
    }

    for (const [name, definition] of Object.entries(options.defaults ?? {}) as Array<[TFlag, FeatureFlagInput]>) {
      this.register(name, definition, 'default');
    }
  }

  public register(name: TFlag, definition: FeatureFlagInput = false, source: FeatureFlagSource = 'runtime'): void {
    const normalized = this.normalizeDefinition(definition);
    const existing = this.flags.get(name);

    this.flags.set(name, {
      ...existing,
      ...normalized,
      source,
    });
  }

  public isEnabled(name: TFlag, fallback = false): boolean {
    return this.flags.get(name)?.enabled ?? fallback;
  }

  public enable(name: TFlag): void {
    this.set(name, true);
  }

  public disable(name: TFlag): void {
    this.set(name, false);
  }

  public enableModule(name: TFlag): void {
    this.enable(name);
  }

  public disableModule(name: TFlag): void {
    this.disable(name);
  }

  public set(name: TFlag, enabled: boolean): void {
    const current = this.flags.get(name) ?? { enabled: false, source: 'runtime' as FeatureFlagSource };

    if (current.enabled === enabled) {
      return;
    }

    this.flags.set(name, {
      ...current,
      enabled,
      source: 'runtime',
    });

    this.notify({
      name,
      enabled,
      previous: current.enabled,
      source: 'runtime',
    });
  }

  public list(): Record<TFlag, FeatureFlagDefinition> {
    return Array.from(this.flags.entries()).reduce((acc, [name, definition]) => {
      acc[name] = {
        enabled: definition.enabled,
        description: definition.description,
      };
      return acc;
    }, {} as Record<TFlag, FeatureFlagDefinition>);
  }

  public onChange(listener: (change: FeatureFlagChange<TFlag>) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private normalizeDefinition(definition: FeatureFlagInput): FeatureFlagDefinition {
    if (typeof definition === 'boolean') {
      return { enabled: definition };
    }

    return definition;
  }

  private notify(change: FeatureFlagChange<TFlag>): void {
    this.logger.info(`Feature flag ${change.name} ${change.enabled ? 'enabled' : 'disabled'}`);

    for (const listener of this.listeners) {
      try {
        listener(change);
      } catch (error) {
        this.logger.error(`Feature flag listener failed for ${change.name}`, error);
      }
    }
  }
}

export function createFeatureFlagRegistry<TFlag extends string = string>(
  options: FeatureFlagRegistryOptions<TFlag> = {},
): FeatureFlagRegistry<TFlag> {
  return new FeatureFlagRegistry<TFlag>(options);
}
