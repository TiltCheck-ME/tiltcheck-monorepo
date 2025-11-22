export interface WalletLink {
  id: string; // ulid
  type: 'phantom' | 'magic' | 'solflare' | string;
  address: string;
  verified: boolean;
  addedAt: string;
}

export interface TrustSignal {
  id: string; // ulid
  discordId: string;
  source: 'suslink' | 'tilt' | 'gameplay' | 'tipping' | 'manual' | string;
  metric: string; // e.g. rtp_drift, link_risk, tip_variance
  value: number; // normalized -1..1 (negative risky, positive good)
  weight: number; // relative weight (0..1)
  createdAt: string;
}

export interface IdentityProfile {
  discordId: string;
  magicIssuer?: string; // DID from Magic auth
  email?: string;
  wallets: WalletLink[];
  trustScore: number; // 0-100
  trustBand: 'RED' | 'YELLOW' | 'GREEN' | 'PLATINUM';
  signals: TrustSignal[];
  createdAt: string;
  updatedAt: string;
  acceptedTermsVersion?: string;
  acceptedTermsAt?: string;
  acceptedPrivacyVersion?: string;
  acceptedPrivacyAt?: string;
}
