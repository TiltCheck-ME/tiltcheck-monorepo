/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */

import {
  TELEMETRY_PATH,
  TELEMETRY_REQUEST_HEADERS,
  WIN_SECURE_PATH,
  getHubEndpoint,
  isBackendFeatureEnabled,
} from './config.js';

export interface RoundTelemetryPayload {
  userId: string;
  bet: number;
  win: number;
  sessionId?: string;
  casinoId?: string;
  gameId?: string;
  timestamp?: number;
}

export interface WinSecurePayload {
  amount: number;
  userId: string;
}

/**
 * Resolves to null without a network call while telemetry has no backend.
 */
function postTelemetry(path: string, payload: RoundTelemetryPayload | WinSecurePayload): Promise<Response | null> {
  if (!isBackendFeatureEnabled('telemetry')) return Promise.resolve(null);
  return fetch(getHubEndpoint(path), {
    method: 'POST',
    headers: TELEMETRY_REQUEST_HEADERS,
    body: JSON.stringify(payload),
  });
}

export function postRoundTelemetry(payload: RoundTelemetryPayload): Promise<Response | null> {
  return postTelemetry(TELEMETRY_PATH, payload);
}

export function postWinSecureTelemetry(payload: WinSecurePayload): Promise<Response | null> {
  return postTelemetry(WIN_SECURE_PATH, payload);
}
