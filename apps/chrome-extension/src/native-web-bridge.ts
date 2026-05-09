/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */

export const TILTCHECK_BRIDGE_VERSION = 1 as const;
export const BRIDGE_SOURCE_NATIVE = 'TILTCHECK_NATIVE';
export const BRIDGE_SOURCE_WEB = 'TILTCHECK_WEB';

export type BridgeVersion = typeof TILTCHECK_BRIDGE_VERSION;
export type BridgeFeatureFlags = Record<string, boolean>;
export type BridgeConfig = Record<string, unknown>;
export type BridgeLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type BridgeModuleState = 'stopped' | 'running' | 'error';

export type NativeToWebBridgeMessage =
  | {
      version: BridgeVersion;
      type: 'init';
      requestId?: string;
      features?: BridgeFeatureFlags;
      config?: BridgeConfig;
    }
  | {
      version: BridgeVersion;
      type: 'module.start';
      module: string;
      requestId?: string;
      config?: BridgeConfig;
    }
  | {
      version: BridgeVersion;
      type: 'module.stop';
      module: string;
      requestId?: string;
    }
  | {
      version: BridgeVersion;
      type: 'status.request';
      requestId?: string;
    };

export type WebToNativeBridgeMessage =
  | {
      version: BridgeVersion;
      type: 'log';
      level: BridgeLogLevel;
      message: string;
      context?: BridgeConfig;
    }
  | {
      version: BridgeVersion;
      type: 'module.state';
      module: string;
      state: BridgeModuleState;
      requestId?: string;
      details?: BridgeConfig;
    }
  | {
      version: BridgeVersion;
      type: 'error';
      code: string;
      message: string;
      requestId?: string;
      context?: BridgeConfig;
    }
  | {
      version: BridgeVersion;
      type: 'status.response';
      requestId?: string;
      status: BridgeStatusSnapshot;
    };

export type BridgeEnvelope<T> = T & {
  source: typeof BRIDGE_SOURCE_NATIVE | typeof BRIDGE_SOURCE_WEB;
  timestamp: number;
};

export interface BridgeModuleSnapshot {
  module: string;
  state: BridgeModuleState;
  updatedAt: number;
  details?: BridgeConfig;
}

export interface BridgeStatusSnapshot {
  initialized: boolean;
  features: BridgeFeatureFlags;
  config: BridgeConfig;
  modules: BridgeModuleSnapshot[];
}

export interface BridgeModuleController {
  name: string;
  start?: (message: Extract<NativeToWebBridgeMessage, { type: 'module.start' }>) => void | Promise<void>;
  stop?: (message: Extract<NativeToWebBridgeMessage, { type: 'module.stop' }>) => void | Promise<void>;
  getStatus?: () => BridgeConfig | undefined;
}

export interface NativeWebBridgeOptions {
  targetWindow?: Window;
  targetOrigin?: string;
}

export interface NativeWebBridgePublicApi {
  version: BridgeVersion;
  log: (level: BridgeLogLevel, message: string, context?: BridgeConfig) => void;
  error: (code: string, message: string, context?: BridgeConfig) => void;
  moduleState: (module: string, state: BridgeModuleState, details?: BridgeConfig) => void;
  getStatus: () => BridgeStatusSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isBridgeConfig(value: unknown): value is BridgeConfig {
  return value === undefined || isRecord(value);
}

function isBridgeFeatureFlags(value: unknown): value is BridgeFeatureFlags {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;

  return Object.values(value).every((flag) => typeof flag === 'boolean');
}

function hasValidRequestId(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

export function isNativeToWebBridgeMessage(value: unknown): value is NativeToWebBridgeMessage {
  if (!isRecord(value) || value.version !== TILTCHECK_BRIDGE_VERSION || typeof value.type !== 'string') {
    return false;
  }

  if (!hasValidRequestId(value.requestId)) {
    return false;
  }

  switch (value.type) {
    case 'init':
      return isBridgeFeatureFlags(value.features) && isBridgeConfig(value.config);
    case 'module.start':
      return typeof value.module === 'string' && value.module.length > 0 && isBridgeConfig(value.config);
    case 'module.stop':
      return typeof value.module === 'string' && value.module.length > 0;
    case 'status.request':
      return true;
    default:
      return false;
  }
}

function cloneRecord(value: BridgeConfig | undefined): BridgeConfig {
  return value ? { ...value } : {};
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class NativeWebBridgeRuntime {
  private initialized = false;
  private features: BridgeFeatureFlags = {};
  private config: BridgeConfig = {};
  private listening = false;
  private readonly moduleControllers = new Map<string, BridgeModuleController>();
  private readonly moduleStates = new Map<string, BridgeModuleSnapshot>();
  private readonly targetWindow: Window;
  private readonly targetOrigin: string;

  private readonly handleWindowMessage = (event: MessageEvent) => {
    if (event.source !== this.targetWindow) return;
    if (!isRecord(event.data) || event.data.source !== BRIDGE_SOURCE_NATIVE) return;

    this.handleNativeMessage(event.data);
  };

  constructor(options: NativeWebBridgeOptions = {}) {
    this.targetWindow = options.targetWindow ?? window;
    this.targetOrigin = options.targetOrigin ?? '*';
  }

  registerModule(controller: BridgeModuleController): void {
    if (!controller.name) {
      throw new Error('Bridge module name is required');
    }

    this.moduleControllers.set(controller.name, controller);
    if (!this.moduleStates.has(controller.name)) {
      this.moduleStates.set(controller.name, {
        module: controller.name,
        state: 'stopped',
        updatedAt: Date.now(),
      });
    }
  }

  listen(): void {
    if (this.listening) return;
    this.targetWindow.addEventListener('message', this.handleWindowMessage);
    this.listening = true;
  }

  destroy(): void {
    if (!this.listening) return;
    this.targetWindow.removeEventListener('message', this.handleWindowMessage);
    this.listening = false;
  }

  handleNativeMessage(message: unknown): void {
    if (!isNativeToWebBridgeMessage(message)) {
      this.emitError('INVALID_MESSAGE', 'Native bridge message failed validation');
      return;
    }

    switch (message.type) {
      case 'init':
        this.initialized = true;
        this.features = cloneRecord(message.features) as BridgeFeatureFlags;
        this.config = cloneRecord(message.config);
        this.emitLog('info', 'Bridge initialized', {
          featureCount: Object.keys(this.features).length,
          configKeys: Object.keys(this.config),
        });
        this.emitStatusResponse(message.requestId);
        break;
      case 'module.start':
        void this.startModule(message);
        break;
      case 'module.stop':
        void this.stopModule(message);
        break;
      case 'status.request':
        this.emitStatusResponse(message.requestId);
        break;
    }
  }

  emitLog(level: BridgeLogLevel, message: string, context?: BridgeConfig): void {
    this.postWebMessage({
      version: TILTCHECK_BRIDGE_VERSION,
      type: 'log',
      level,
      message,
      context,
    });
  }

  emitError(code: string, message: string, context?: BridgeConfig, requestId?: string): void {
    this.postWebMessage({
      version: TILTCHECK_BRIDGE_VERSION,
      type: 'error',
      code,
      message,
      requestId,
      context,
    });
  }

  emitModuleState(module: string, state: BridgeModuleState, details?: BridgeConfig, requestId?: string): void {
    this.setModuleState(module, state, details, requestId);
  }

  getStatus(): BridgeStatusSnapshot {
    const modules = Array.from(this.moduleStates.values()).map((snapshot) => {
      const controller = this.moduleControllers.get(snapshot.module);
      const details = controller?.getStatus?.() ?? snapshot.details;

      return {
        ...snapshot,
        details,
      };
    });

    return {
      initialized: this.initialized,
      features: { ...this.features },
      config: { ...this.config },
      modules,
    };
  }

  getPublicApi(): NativeWebBridgePublicApi {
    return {
      version: TILTCHECK_BRIDGE_VERSION,
      log: (level, message, context) => this.emitLog(level, message, context),
      error: (code, message, context) => this.emitError(code, message, context),
      moduleState: (module, state, details) => this.emitModuleState(module, state, details),
      getStatus: () => this.getStatus(),
    };
  }

  private async startModule(message: Extract<NativeToWebBridgeMessage, { type: 'module.start' }>): Promise<void> {
    const controller = this.moduleControllers.get(message.module);
    if (!controller) {
      this.emitError('UNKNOWN_MODULE', `Bridge module is not registered: ${message.module}`, undefined, message.requestId);
      return;
    }

    try {
      await controller.start?.(message);
      this.setModuleState(message.module, 'running', controller.getStatus?.(), message.requestId);
    } catch (error) {
      const reason = messageFromError(error);
      this.setModuleState(message.module, 'error', { reason }, message.requestId);
      this.emitError('MODULE_START_FAILED', reason, { module: message.module }, message.requestId);
    }
  }

  private async stopModule(message: Extract<NativeToWebBridgeMessage, { type: 'module.stop' }>): Promise<void> {
    const controller = this.moduleControllers.get(message.module);
    if (!controller) {
      this.emitError('UNKNOWN_MODULE', `Bridge module is not registered: ${message.module}`, undefined, message.requestId);
      return;
    }

    try {
      await controller.stop?.(message);
      this.setModuleState(message.module, 'stopped', controller.getStatus?.(), message.requestId);
    } catch (error) {
      const reason = messageFromError(error);
      this.setModuleState(message.module, 'error', { reason }, message.requestId);
      this.emitError('MODULE_STOP_FAILED', reason, { module: message.module }, message.requestId);
    }
  }

  private setModuleState(module: string, state: BridgeModuleState, details?: BridgeConfig, requestId?: string): void {
    const snapshot: BridgeModuleSnapshot = {
      module,
      state,
      details,
      updatedAt: Date.now(),
    };
    this.moduleStates.set(module, snapshot);
    this.postWebMessage({
      version: TILTCHECK_BRIDGE_VERSION,
      type: 'module.state',
      module,
      state,
      details,
      requestId,
    });
  }

  private emitStatusResponse(requestId?: string): void {
    this.postWebMessage({
      version: TILTCHECK_BRIDGE_VERSION,
      type: 'status.response',
      requestId,
      status: this.getStatus(),
    });
  }

  private postWebMessage(message: WebToNativeBridgeMessage): void {
    this.targetWindow.postMessage({
      source: BRIDGE_SOURCE_WEB,
      timestamp: Date.now(),
      ...message,
    } satisfies BridgeEnvelope<WebToNativeBridgeMessage>, this.targetOrigin);
  }
}
