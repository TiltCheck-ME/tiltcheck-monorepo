/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */

export type TiltCheckRuntimeStatus = {
  version: string;
  host: string;
  startedAt: number;
  enabledModules: string[];
};

export type TiltCheckBridgeMessage =
  | { type: 'tc.log'; level: 'info' | 'warn' | 'error'; message: string; data?: unknown }
  | { type: 'tc.status'; status: TiltCheckRuntimeStatus };

export type TiltCheckBridge = {
  post: (msg: TiltCheckBridgeMessage) => void;
};

export type TiltCheckRuntimeConfig = {
  allowHosts: string[];
  modules: {
    autovaultStake?: boolean;
  };
};

const RUNTIME_VERSION = 'mobile_v1_runtime_0.1.0';

function getHost(): string {
  try {
    return typeof window !== 'undefined' ? window.location.hostname : 'unknown';
  } catch {
    return 'unknown';
  }
}

function safeNow(): number {
  return Date.now();
}

function defaultBridge(): TiltCheckBridge {
  return {
    post: () => {},
  };
}

function isAllowedHost(host: string, allowHosts: string[]): boolean {
  const normalized = host.toLowerCase();
  return allowHosts.some((allowed) => allowed.toLowerCase() === normalized);
}

export function initTiltCheckInjectedRuntime(input: {
  config: TiltCheckRuntimeConfig;
  bridge?: TiltCheckBridge;
}): TiltCheckRuntimeStatus {
  const bridge = input.bridge ?? defaultBridge();
  const host = getHost();
  const startedAt = safeNow();

  if (!isAllowedHost(host, input.config.allowHosts)) {
    bridge.post({
      type: 'tc.log',
      level: 'warn',
      message: `TiltCheck injected runtime disabled on off-scope host: ${host}`,
    });
    return {
      version: RUNTIME_VERSION,
      host,
      startedAt,
      enabledModules: [],
    };
  }

  const enabledModules: string[] = [];

  if (input.config.modules.autovaultStake) {
    enabledModules.push('autovaultStake');
    bridge.post({
      type: 'tc.log',
      level: 'info',
      message: 'TiltCheck runtime: autovaultStake enabled (stub).',
    });
  }

  const status: TiltCheckRuntimeStatus = {
    version: RUNTIME_VERSION,
    host,
    startedAt,
    enabledModules,
  };

  bridge.post({ type: 'tc.status', status });
  return status;
}

