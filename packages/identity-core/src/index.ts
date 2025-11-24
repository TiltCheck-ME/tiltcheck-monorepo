/**
 * Identity Core - Trust scoring and identity management
 */

export type TrustBand = 'RED' | 'YELLOW' | 'GREEN' | 'PLATINUM';

export interface TrustProfile {
  userId: string;
  trustScore: number;
  signals: TrustSignal[];
  lastUpdated: number;
}

export interface TrustSignal {
  category: string;
  signalType: string;
  weight: number;
  confidence: number;
  timestamp: number;
}

// In-memory storage for user profiles
const profiles = new Map<string, TrustProfile>();

// Default trust score for new users
const DEFAULT_TRUST_SCORE = 50;

/**
 * Get or create a trust profile for a user
 */
export function getProfile(userId: string): TrustProfile {
  if (!profiles.has(userId)) {
    profiles.set(userId, {
      userId,
      trustScore: DEFAULT_TRUST_SCORE,
      signals: [],
      lastUpdated: Date.now(),
    });
  }
  return profiles.get(userId)!;
}

/**
 * Add a trust signal and update the user's trust score
 */
export function addTrustSignal(
  userId: string,
  category: string,
  signalType: string,
  weight: number,
  confidence: number
): void {
  const profile = getProfile(userId);
  
  const signal: TrustSignal = {
    category,
    signalType,
    weight,
    confidence,
    timestamp: Date.now(),
  };
  
  profile.signals.push(signal);
  
  // Update trust score based on weighted signal
  // Increase impact by using a larger scale factor
  const impact = weight * confidence * 25; // Increased from 10 to 25
  profile.trustScore = Math.max(0, Math.min(100, profile.trustScore + impact));
  profile.lastUpdated = Date.now();
}

/**
 * Get trust band based on trust score
 */
export function getTrustBand(trustScore: number): TrustBand {
  if (trustScore >= 80) return 'PLATINUM';
  if (trustScore >= 60) return 'GREEN';
  if (trustScore >= 30) return 'YELLOW';
  return 'RED';
}

/**
 * Clear all trust profiles (for testing)
 */
export function clearProfiles(): void {
  profiles.clear();
}

// Note: Gameplay anomaly detection disabled per requirements
// Previously subscribed to fairness.pump.detected and fairness.cluster.detected
// but we don't reduce trust scores for game anomalies anymore
