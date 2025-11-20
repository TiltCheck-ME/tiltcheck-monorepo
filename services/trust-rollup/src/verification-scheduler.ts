/**
 * Casino Verification Scheduler
 * Periodically fetches external casino data and publishes casino.rollup events
 */

import { eventRouter } from '@tiltcheck/event-router';
import { fetchCasinoExternalData, calculateTrustDeltas } from './external-fetchers.js';

// List of casinos to monitor
// TODO: Make this dynamic (pull from active casinos in trust engine)
const MONITORED_CASINOS = [
  'stake.com',
  'duelbits.com',
  'rollbit.com',
  'roobet.com',
  'bc.game',
];

// How often to check each casino (in hours)
const VERIFICATION_INTERVAL_HOURS = 6;
const VERIFICATION_INTERVAL_MS = VERIFICATION_INTERVAL_HOURS * 60 * 60 * 1000;

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
 * Verify all monitored casinos
 */
async function verifyAllCasinos() {
  console.log('[CasinoVerification] Starting verification cycle...');
  
  for (const casino of MONITORED_CASINOS) {
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

  console.log(`[CasinoVerification] Starting scheduler (every ${VERIFICATION_INTERVAL_HOURS}h)`);
  
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
 * Add a casino to the monitoring list
 */
export function addMonitoredCasino(casinoName: string) {
  if (!MONITORED_CASINOS.includes(casinoName)) {
    MONITORED_CASINOS.push(casinoName);
    console.log(`[CasinoVerification] Added ${casinoName} to monitoring`);
  }
}

/**
 * Remove a casino from monitoring
 */
export function removeMonitoredCasino(casinoName: string) {
  const index = MONITORED_CASINOS.indexOf(casinoName);
  if (index > -1) {
    MONITORED_CASINOS.splice(index, 1);
    console.log(`[CasinoVerification] Removed ${casinoName} from monitoring`);
  }
}

/**
 * Get list of monitored casinos
 */
export function getMonitoredCasinos() {
  return [...MONITORED_CASINOS];
}
