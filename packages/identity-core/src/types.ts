export interface WalletLink {
  id: string;
  type: string; // phantom | magic | etc.
  address: string;
  verified: boolean;
  addedAt: string;
}

export interface TrustSignal {
  id: string;
  discordId: string;
  source: string; // tilt | link | gameplay | tip | manual
  metric: string; // e.g. rtp_drift, link_risk
  value: number; // -1 .. 1
  weight: number; // 0 .. 1
  createdAt: string;
}

export interface IdentityProfile {
  discordId: string;
  email?: string;
  wallets: WalletLink[];
  trustScore: number; // 0..100
  trustBand: 'RED' | 'YELLOW' | 'GREEN' | 'PLATINUM';
  signals: TrustSignal[];
  createdAt: string;
  updatedAt: string;
}
