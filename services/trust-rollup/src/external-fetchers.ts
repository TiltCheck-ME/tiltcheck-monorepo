/**
 * External Data Fetchers
 * Fetches casino data from external sources to feed Trust Engines
 * 
 * NOTE: This is a scrappy MVP implementation using free/public sources.
 * Future: Replace with real casino APIs when available.
 */

export interface CasinoExternalData {
  casinoName: string;
  rtpData?: {
    claimed: number; // Casino-claimed RTP
    verified?: number; // Third-party verified RTP (if available)
    confidence: number; // 0-1 confidence in data
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
  };
  complianceData?: {
    licensed: boolean;
    licenseJurisdiction?: string;
    kycRequired: boolean;
    reputation: 'good' | 'neutral' | 'poor';
  };
}

/**
 * Mock RTP verification
 * Real implementation would call askgamblers.com, casinomeister.com APIs
 */
export async function fetchRTPData(casinoName: string): Promise<CasinoExternalData['rtpData']> {
  // TODO: Implement real API calls when available
  // For now, return mock data to demonstrate structure
  
  const mockData: Record<string, CasinoExternalData['rtpData']> = {
    'stake.com': { claimed: 96.5, verified: 96.2, confidence: 0.85 },
    'duelbits.com': { claimed: 97.0, verified: 96.8, confidence: 0.75 },
    'rollbit.com': { claimed: 96.0, confidence: 0.5 }, // No verification available
  };

  return mockData[casinoName.toLowerCase()] || { claimed: 96.0, confidence: 0.3 };
}

/**
 * Fetch payout speed data from community sources
 * Real implementation would scrape trustpilot, reddit, askgamblers
 */
export async function fetchPayoutData(casinoName: string): Promise<CasinoExternalData['payoutData']> {
  // TODO: Implement real scraping/API calls
  // For now, return mock data
  
  const mockData: Record<string, CasinoExternalData['payoutData']> = {
    'stake.com': { averageHours: 2, complaints: 5, source: 'community-reports' },
    'duelbits.com': { averageHours: 4, complaints: 12, source: 'community-reports' },
    'rollbit.com': { averageHours: 24, complaints: 45, source: 'community-reports' },
  };

  return mockData[casinoName.toLowerCase()] || { 
    averageHours: 48, 
    complaints: 0, 
    source: 'unknown' 
  };
}

/**
 * Fetch current bonus terms
 * Real implementation would scrape casino sites or use affiliate APIs
 */
export async function fetchBonusData(casinoName: string): Promise<CasinoExternalData['bonusData']> {
  // TODO: Implement real scraping
  // For now, return mock data
  
  const mockData: Record<string, CasinoExternalData['bonusData']> = {
    'stake.com': { 
      currentOffer: '200% deposit bonus',
      wageringRequirement: 40,
      maxWithdrawal: 10000,
      restrictive: false 
    },
    'duelbits.com': { 
      currentOffer: '100% + 100 free spins',
      wageringRequirement: 50,
      maxWithdrawal: 5000,
      restrictive: true // High wagering + low max
    },
  };

  return mockData[casinoName.toLowerCase()] || {
    currentOffer: 'unknown',
    restrictive: false
  };
}

/**
 * Fetch compliance/licensing data
 * Real implementation would check licensing authorities
 */
export async function fetchComplianceData(casinoName: string): Promise<CasinoExternalData['complianceData']> {
  // TODO: Implement real license verification
  // For now, return mock data
  
  const mockData: Record<string, CasinoExternalData['complianceData']> = {
    'stake.com': { 
      licensed: true, 
      licenseJurisdiction: 'Curacao',
      kycRequired: true,
      reputation: 'good' 
    },
    'duelbits.com': { 
      licensed: true, 
      licenseJurisdiction: 'Curacao',
      kycRequired: true,
      reputation: 'neutral' 
    },
    'rollbit.com': { 
      licensed: false, 
      kycRequired: false,
      reputation: 'poor' 
    },
  };

  return mockData[casinoName.toLowerCase()] || {
    licensed: false,
    kycRequired: true,
    reputation: 'neutral'
  };
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

  return {
    casinoName,
    rtpData,
    payoutData,
    bonusData,
    complianceData,
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
