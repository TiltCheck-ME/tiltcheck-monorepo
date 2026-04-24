/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */

export type ApiRuntimeEnv = Record<string, string | undefined> & {
  NODE_ENV?: string;
  PORT?: string;
};

export function resolveApiPort(env: ApiRuntimeEnv): number {
  const rawPort = env.NODE_ENV === 'production' ? env.PORT?.trim() || '8080' : '8080';
  const parsedPort = Number.parseInt(rawPort, 10);
  return Number.isFinite(parsedPort) ? parsedPort : 8080;
}
