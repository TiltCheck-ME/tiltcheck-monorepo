// Dashboard local type shims to relax strict workspace typing
// Provides additional event type literals and widens router interfaces for build continuity.

declare module '@tiltcheck/event-router' {
  // Augment the TiltCheckEvent interface if it exists
  interface TiltCheckEvent<T = any> {
    type: string; // widen to allow trust.* events
    data: T;
    timestamp: number;
    source: string;
  }
}

// Provide ambient declarations for trust event payloads used locally
interface TrustDomainUpdateEvent { domain: string; delta?: number; severity?: number; reason?: string }
interface TrustCasinoUpdateEvent { casinoName: string; delta?: number; severity?: number; reason?: string }
interface TrustDegenUpdateEvent { userId: string; delta?: number; severity?: number; reason?: string }

// RiskAlert already defined in state.ts but can be referenced here if needed
interface RiskAlert {
  kind: 'domain-delta' | 'casino-delta' | 'critical-severity' | 'domain-anomaly';
  entity: string;
  totalDelta?: number;
  severity?: number;
  firstSeenTs: number;
}
