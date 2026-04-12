// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
/**
 * Consent lookups for optional telemetry and trust-engine data use.
 * The bot caches API lookups briefly so message handling stays cheap.
 */

interface UserDataConsentState {
  messageContents: boolean;
  financialData: boolean;
  sessionTelemetry: boolean;
  notifyNftIdentityReady: boolean;
  complianceBypass: boolean;
}

interface CachedConsentState {
  expiresAt: number;
  value: UserDataConsentState;
}

const DEFAULT_DATA_CONSENT_STATE: UserDataConsentState = {
  messageContents: false,
  financialData: false,
  sessionTelemetry: false,
  notifyNftIdentityReady: false,
  complianceBypass: false,
};

const CONSENT_CACHE_TTL_MS = 5 * 60 * 1000;
const consentCache = new Map<string, CachedConsentState>();
const apiBaseUrl = process.env.BACKEND_URL || process.env.API_BASE_URL || 'http://localhost:3000';
let hasWarnedMissingConsentConfig = false;

async function fetchConsentState(userId: string): Promise<UserDataConsentState> {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    if (!hasWarnedMissingConsentConfig) {
      console.warn('[Consent] INTERNAL_API_SECRET is missing. Optional telemetry and trust-engine ingestion will be skipped.');
      hasWarnedMissingConsentConfig = true;
    }
    return DEFAULT_DATA_CONSENT_STATE;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/user/internal/consents/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${internalSecret}`,
      },
    });

    if (!response.ok) {
      console.warn(`[Consent] Failed to resolve consents for ${userId}: ${response.status} ${response.statusText}`);
      return DEFAULT_DATA_CONSENT_STATE;
    }

    const payload = await response.json() as Partial<UserDataConsentState>;
    return {
      messageContents: payload.messageContents === true,
      financialData: payload.financialData === true,
      sessionTelemetry: payload.sessionTelemetry === true,
      notifyNftIdentityReady: payload.notifyNftIdentityReady === true,
      complianceBypass: payload.complianceBypass === true,
    };
  } catch (error) {
    console.warn(`[Consent] Failed to fetch consent state for ${userId}:`, error);
    return DEFAULT_DATA_CONSENT_STATE;
  }
}

export async function getUserDataConsentState(userId: string): Promise<UserDataConsentState> {
  const cached = consentCache.get(userId);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await fetchConsentState(userId);
  consentCache.set(userId, {
    value,
    expiresAt: now + CONSENT_CACHE_TTL_MS,
  });

  return value;
}

export async function hasMessageContentConsent(userId: string): Promise<boolean> {
  const consentState = await getUserDataConsentState(userId);
  return consentState.messageContents;
}

export async function hasSessionTelemetryConsent(userId: string): Promise<boolean> {
  const consentState = await getUserDataConsentState(userId);
  return consentState.sessionTelemetry;
}

export async function hasFinancialTelemetryConsent(userId: string): Promise<boolean> {
  const consentState = await getUserDataConsentState(userId);
  return consentState.sessionTelemetry && consentState.financialData;
}
