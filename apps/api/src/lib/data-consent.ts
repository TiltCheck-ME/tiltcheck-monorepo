/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12 */
/**
 * Data sharing consent helpers.
 * Resolves persisted onboarding consents into a single enforcement shape.
 */

import { findOnboardingByDiscordId } from '@tiltcheck/db';

export interface UserDataConsentState {
  messageContents: boolean;
  financialData: boolean;
  sessionTelemetry: boolean;
  notifyNftIdentityReady: boolean;
  complianceBypass: boolean;
}

export const DEFAULT_DATA_CONSENT_STATE: UserDataConsentState = {
  messageContents: false,
  financialData: false,
  sessionTelemetry: false,
  notifyNftIdentityReady: false,
  complianceBypass: false,
};

export async function getUserDataConsentState(discordId: string): Promise<UserDataConsentState> {
  if (!discordId) {
    return DEFAULT_DATA_CONSENT_STATE;
  }

  const onboarding = await findOnboardingByDiscordId(discordId);
  if (!onboarding) {
    return DEFAULT_DATA_CONSENT_STATE;
  }

  const complianceBypass = onboarding.compliance_bypass === true;

  return {
    messageContents: complianceBypass || onboarding.share_message_contents === true,
    financialData: complianceBypass || onboarding.share_financial_data === true,
    sessionTelemetry: complianceBypass || onboarding.share_session_telemetry === true,
    notifyNftIdentityReady: complianceBypass || onboarding.notify_nft_identity_ready === true,
    complianceBypass,
  };
}
