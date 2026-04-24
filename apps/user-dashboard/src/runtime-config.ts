/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */

export type DashboardRuntimeEnv = Record<string, string | undefined> & {
  NODE_ENV?: string;
  PORT?: string;
  USER_DASHBOARD_PORT?: string;
  TILT_API_BASE_URL?: string;
};

export function resolveDashboardPort(env: DashboardRuntimeEnv): string {
  const explicitDashboardPort = env.USER_DASHBOARD_PORT?.trim();
  if (explicitDashboardPort) {
    return explicitDashboardPort;
  }

  if (env.NODE_ENV === 'production') {
    return env.PORT?.trim() || '6001';
  }

  return '6001';
}

export function resolveCanonicalApiBaseUrl(env: DashboardRuntimeEnv): string {
  if (env.NODE_ENV === 'production') {
    return env.TILT_API_BASE_URL?.trim() || 'https://api.tiltcheck.me';
  }

  return 'http://localhost:8080';
}
