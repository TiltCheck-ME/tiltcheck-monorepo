/**
 * Casino Verification Scheduler
 * Periodically fetches external casino data and publishes casino.rollup events.
 * Dynamically pulls active casinos from configured sources (trust engine, file, or env).
 */

import { eventRouter } from '@tiltcheck/event-router';
import { fetchCasinoExternalData, calculateTrustDeltas } from './external-fetchers.js';
import { fetchActiveCasinos, getSourceConfig, type CasinoSourceResult } from './casino-source-provider.js';

// How often to check each casino (in hours)
const VERIFICATION_INTERVAL_HOURS = 6;
const VERIFICATION_INTERVAL_MS = VERIFICATION_INTERVAL_HOURS * 60 * 60 * 1000;

// Cache for dynamic casino list with TTL
let cachedCasinos: CasinoSourceResult | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let verificationInterval: NodeJS.Timeout | null = null;

/**
 * Verify a single casino and publish rollup event
 */
async function verifyCasino(casinoName: string) {
  try {
    console.log(`[CasinoVerification] Fetching data for ${casinoName}...`);
    
    const externalData = await fetchCasinoExternalData(casinoName);
    const deltas = calculateTrustDeltas(externalData);

    // Build casino rollup payload
    const entries: Record<string, any> = {};
    
    // Only include casinos with non-zero deltas
    const totalDelta = Object.values(deltas).reduce((sum, val) => sum + val, 0);
    
    if (totalDelta !== 0) {
      entries[casinoName] = {
        totalDelta,
        events: 1,
        lastScore: undefined, // Will be filled by Trust Engine
        externalData: {
          fairnessDelta: deltas.fairness,
          payoutDelta: deltas.payoutSpeed,
          bonusDelta: deltas.bonusTerms,
          complianceDelta: deltas.compliance,
          supportDelta: deltas.supportQuality,
        }
      };

      // Publish rollup event
      await eventRouter.publish(
        'casino.rollup.completed' as any,
        'trust-rollup',
        {
          windowStart: Date.now() - VERIFICATION_INTERVAL_MS,
          windowEnd: Date.now(),
          casinos: entries,
          source: 'external-verification',
        }
      );

      console.log(`[CasinoVerification] ${casinoName} verified, total delta: ${totalDelta}`);
    } else {
      console.log(`[CasinoVerification] ${casinoName} verified, no changes`);
    }
  } catch (error) {
    console.error(`[CasinoVerification] Failed to verify ${casinoName}:`, error);
  }
}

/**
 * Get the current list of active casinos, using cached results if fresh
 */
async function getActiveCasinos(): Promise<string[]> {
  const now = Date.now();
  
  // Use cache if still valid
  if (cachedCasinos && (now - cachedCasinos.fetchedAt) < CACHE_TTL_MS) {
    return cachedCasinos.casinos;
  }
  
  // Fetch fresh casino list
  cachedCasinos = await fetchActiveCasinos();
  return cachedCasinos.casinos;
}

/**
 * Verify all monitored casinos
 */
async function verifyAllCasinos() {
  console.log('[CasinoVerification] Starting verification cycle...');
  
  // Fetch active casinos dynamically
  const casinos = await getActiveCasinos();
  const source = cachedCasinos?.source || 'unknown';
  
  console.log(`[CasinoVerification] Verifying ${casinos.length} casinos (source: ${source})`);
  
  for (const casino of casinos) {
    await verifyCasino(casino);
    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('[CasinoVerification] Verification cycle complete');
}

/**
 * Start the periodic verification scheduler
 */
export function startCasinoVerificationScheduler() {
  if (verificationInterval) {
    console.log('[CasinoVerification] Scheduler already running');
    return;
  }

  // Log source configuration at startup (mask sensitive paths in production)
  const sourceConfig = getSourceConfig();
  const logConfig = {
    trustEngine: sourceConfig.trustEngineUrl ? 'configured' : 'not configured',
    sourceFile: sourceConfig.sourceFile ? 'configured' : 'not configured',
    envList: sourceConfig.envList ? 'configured' : 'not configured',
    hasDefaults: sourceConfig.hasDefaults
  };
  console.log(`[CasinoVerification] Starting scheduler (every ${VERIFICATION_INTERVAL_HOURS}h)`);
  console.log(`[CasinoVerification] Source config: ${JSON.stringify(logConfig)}`);
  
  // Run immediately on start
  verifyAllCasinos().catch(console.error);
  
  // Then run periodically
  verificationInterval = setInterval(() => {
    verifyAllCasinos().catch(console.error);
  }, VERIFICATION_INTERVAL_MS);
}

/**
 * Stop the verification scheduler
 */
export function stopCasinoVerificationScheduler() {
  if (verificationInterval) {
    clearInterval(verificationInterval);
    verificationInterval = null;
    cachedCasinos = null; // Clear cache on stop
    console.log('[CasinoVerification] Scheduler stopped');
  }
}

/**
 * Manually trigger verification (for testing)
 */
export async function triggerManualVerification(casinoName?: string) {
  if (casinoName) {
    await verifyCasino(casinoName);
  } else {
    await verifyAllCasinos();
  }
}

/**
 * Force refresh the casino list cache
 * Useful when casino configuration changes
 */
export function refreshCasinoCache(): void {
  cachedCasinos = null;
  console.log('[CasinoVerification] Casino cache cleared, will refresh on next cycle');
}

/**
 * Get list of monitored casinos (async as it may need to fetch dynamically)
 */
export async function getMonitoredCasinos(): Promise<string[]> {
  const casinos = await getActiveCasinos();
  return [...casinos];
}

/**
 * Get source information about current casino list
 */
export function getCasinoSourceInfo(): { source: string; count: number; fetchedAt: number } | null {
  if (!cachedCasinos) {
    return null;
  }
  return {
    source: cachedCasinos.source,
    count: cachedCasinos.casinos.length,
    fetchedAt: cachedCasinos.fetchedAt
  };
}
