/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */

import {
  TELEMETRY_PATH,
  TELEMETRY_REQUEST_HEADERS,
  WIN_SECURE_PATH,
  getHubEndpoint,
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

function postTelemetry(path: string, payload: RoundTelemetryPayload | WinSecurePayload): Promise<Response> {
  return fetch(getHubEndpoint(path), {
    method: 'POST',
    headers: TELEMETRY_REQUEST_HEADERS,
    body: JSON.stringify(payload),
  });
}

export function postRoundTelemetry(payload: RoundTelemetryPayload): Promise<Response> {
  return postTelemetry(TELEMETRY_PATH, payload);
}

export function postWinSecureTelemetry(payload: WinSecurePayload): Promise<Response> {
  return postTelemetry(WIN_SECURE_PATH, payload);
}
