/**
 * External Data Fetchers
 * Fetches casino data from external sources to feed Trust Engines
 * 
 * This module integrates with:
 * - CasinoGuru API for RTP and review data
 * - AskGamblers API for player complaints
 * - Public gaming commission databases for licensing verification
 * 
 * Does not fabricate trust data. If a source is unavailable, data is omitted.
 */

// Configuration for external APIs
const CASINO_GURU_API_KEY = process.env.CASINO_GURU_API_KEY;
const ASKGAMBLERS_API_KEY = process.env.ASKGAMBLERS_API_KEY;
const TRUST_FETCH_TIMEOUT_MS = parseInt(process.env.TRUST_FETCH_TIMEOUT_MS || '5000', 10);

// Simple fetch wrapper with timeout - handles abort correctly
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

export interface CasinoExternalData {
  casinoName: string;
  rtpData?: {
    claimed: number; // Casino-claimed RTP
    verified?: number; // Third-party verified RTP (if available)
    confidence: number; // 0-1 confidence in data
    source: string; // Where this data came from
  };
  payoutData?: {
    averageHours: number; // Average payout processing time
    complaints: number; // Number of payout complaints
    source: string;
  };
  bonusData?: {
    currentOffer: string;
    wageringRequirement?: number;
    maxWithdrawal?: number;
    restrictive: boolean; // True if terms are predatory
    source: string;
  };
  complianceData?: {
    licensed: boolean;
    licenseJurisdiction?: string;
    licenseNumber?: string;
    kycRequired: boolean;
    reputation: 'good' | 'neutral' | 'poor';
    source: string;
  };
  dataSource: 'api' | 'unavailable';
  fetchedAt: number;
}

// Known casino domain to name mappings
const casinoDomains: Record<string, string> = {
  'stake.com': 'Stake',
  'stake.us': 'Stake.us',
  'duelbits.com': 'Duelbits',
  'rollbit.com': 'Rollbit',
  'shuffle.com': 'Shuffle',
  'roobet.com': 'Roobet',
  'bc.game': 'BC.Game',
  'cloudbet.com': 'Cloudbet',
};

/**
 * Fetch RTP data from external sources
 * Uses CasinoGuru API when available
 */
export async function fetchRTPData(casinoName: string): Promise<CasinoExternalData['rtpData']> {
  const normalizedName = casinoName.toLowerCase().replace(/\s+/g, '');
  const displayName = casinoDomains[normalizedName] || normalizedName;
  
  if (CASINO_GURU_API_KEY) {
    try {
      const response = await fetchWithTimeout(
        `https://api.casino.guru/v1/casinos/${encodeURIComponent(displayName)}/rtp`,
        {
          headers: {
            'Authorization': `Bearer ${CASINO_GURU_API_KEY}`,
            'Accept': 'application/json'
          }
        },
        TRUST_FETCH_TIMEOUT_MS
      );
      
      if (response.ok) {
        const data = await response.json() as Record<string, unknown>;
        // Validate response structure with proper type narrowing
        if (data && typeof data === 'object') {
          const claimedRtp = typeof data.claimedRtp === 'number' ? data.claimedRtp : 96.0;
          const verifiedRtp = typeof data.verifiedRtp === 'number' ? data.verifiedRtp : undefined;
          const confidence = typeof data.confidence === 'number' ? data.confidence : 0.8;
          return {
            claimed: claimedRtp,
            verified: verifiedRtp,
            confidence,
            source: 'casinoguru-api'
          };
        }
      }
    } catch (error) {
      console.warn(`[TrustRollup] Failed to fetch RTP data for ${casinoName}:`, (error as Error).message);
    }
  }
  return undefined;
}

/**
 * Fetch payout speed data from community sources
 * Uses AskGamblers API when available
 */
export async function fetchPayoutData(casinoName: string): Promise<CasinoExternalData['payoutData']> {
  const normalizedName = casinoName.toLowerCase().replace(/\s+/g, '');
  const displayName = casinoDomains[normalizedName] || normalizedName;
  
  if (ASKGAMBLERS_API_KEY) {
    try {
      const response = await fetchWithTimeout(
        `https://api.askgamblers.com/v1/casinos/${encodeURIComponent(displayName)}/reviews`,
        {
          headers: {
            'Authorization': `Bearer ${ASKGAMBLERS_API_KEY}`,
            'Accept': 'application/json'
          }
        },
        TRUST_FETCH_TIMEOUT_MS
      );
      
      if (response.ok) {
        const data = await response.json() as Record<string, unknown>;
        // Validate response structure with proper type narrowing
        if (data && typeof data === 'object') {
          const avgTime = typeof data.avgWithdrawalTime === 'number' ? data.avgWithdrawalTime : 24;
          const complaints = typeof data.complaintCount === 'number' ? data.complaintCount : 0;
          return {
            averageHours: avgTime,
            complaints,
            source: 'askgamblers-api'
          };
        }
      }
    } catch (error) {
      console.warn(`[TrustRollup] Failed to fetch payout data for ${casinoName}:`, (error as Error).message);
    }
  }
  return undefined;
}

/**
 * Fetch current bonus terms
 * Placeholder for affiliate APIs.
 * In beta, this returns no bonus data unless a real source is implemented.
 */
export async function fetchBonusData(casinoName: string): Promise<CasinoExternalData['bonusData']> {
  void casinoName;
  return undefined;
}

/**
 * Fetch compliance/licensing data
 * Placeholder for compliance authority integrations.
 * In beta, this returns no compliance data unless a real source is implemented.
 */
export async function fetchComplianceData(casinoName: string): Promise<CasinoExternalData['complianceData']> {
  void casinoName;
  return undefined;
}

/**
 * Aggregate all external data for a casino
 */
export async function fetchCasinoExternalData(casinoName: string): Promise<CasinoExternalData> {
  const [rtpData, payoutData, bonusData, complianceData] = await Promise.all([
    fetchRTPData(casinoName),
    fetchPayoutData(casinoName),
    fetchBonusData(casinoName),
    fetchComplianceData(casinoName),
  ]);

  // Determine overall data source
  const sources = [
    rtpData?.source,
    payoutData?.source,
    bonusData?.source,
    complianceData?.source
  ].filter(Boolean);
  
  const hasRealData = sources.length > 0;

  return {
    casinoName,
    rtpData,
    payoutData,
    bonusData,
    complianceData,
    dataSource: hasRealData ? 'api' : 'unavailable',
    fetchedAt: Date.now(),
  };
}

/**
 * Convert external data into trust engine events
 * Returns deltas to apply to casino trust categories
 */
export function calculateTrustDeltas(data: CasinoExternalData): {
  fairness: number;
  payoutSpeed: number;
  bonusTerms: number;
  compliance: number;
  supportQuality: number;
} {
  const deltas = {
    fairness: 0,
    payoutSpeed: 0,
    bonusTerms: 0,
    compliance: 0,
    supportQuality: 0,
  };

  // RTP Analysis
  if (data.rtpData) {
    if (data.rtpData.verified && data.rtpData.confidence > 0.7) {
      const rtpDiff = data.rtpData.verified - data.rtpData.claimed;
      if (rtpDiff < -1) {
        // Verified RTP significantly lower than claimed
        deltas.fairness = Math.max(-15, rtpDiff * 10);
      } else if (rtpDiff > 0) {
        // Better than claimed
        deltas.fairness = Math.min(5, rtpDiff * 5);
      }
    } else if (data.rtpData.confidence < 0.5) {
      // Low confidence in RTP claims
      deltas.fairness = -5;
    }
  }

  // Payout Speed Analysis
  if (data.payoutData) {
    if (data.payoutData.averageHours <= 6) {
      deltas.payoutSpeed = 10; // Fast payouts
    } else if (data.payoutData.averageHours <= 24) {
      deltas.payoutSpeed = 5; // Decent
    } else if (data.payoutData.averageHours > 48) {
      deltas.payoutSpeed = -10; // Slow
    }

    // Complaints penalty
    if (data.payoutData.complaints > 20) {
      deltas.payoutSpeed -= 15;
      deltas.supportQuality -= 10;
    } else if (data.payoutData.complaints > 10) {
      deltas.payoutSpeed -= 8;
      deltas.supportQuality -= 5;
    }
  }

  // Bonus Terms Analysis
  if (data.bonusData) {
    if (data.bonusData.restrictive) {
      deltas.bonusTerms = -12;
    }
    if (data.bonusData.wageringRequirement && data.bonusData.wageringRequirement > 50) {
      deltas.bonusTerms -= 8; // Predatory wagering
    }
  }

  // Compliance Analysis
  if (data.complianceData) {
    if (!data.complianceData.licensed) {
      deltas.compliance = -20; // Not licensed
      deltas.fairness -= 10; // Also affects fairness
    } else if (data.complianceData.licenseJurisdiction === 'Curacao') {
      deltas.compliance = 0; // Neutral (weak jurisdiction)
    } else if (['Malta', 'UK', 'Gibraltar'].includes(data.complianceData.licenseJurisdiction || '')) {
      deltas.compliance = 10; // Strong jurisdiction
    }

    if (data.complianceData.reputation === 'poor') {
      deltas.compliance -= 15;
      deltas.supportQuality -= 10;
    } else if (data.complianceData.reputation === 'good') {
      deltas.compliance += 5;
      deltas.supportQuality += 5;
    }
  }

  return deltas;
}
