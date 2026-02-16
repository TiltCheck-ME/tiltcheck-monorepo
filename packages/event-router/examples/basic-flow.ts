/**
 * Example: How Modules Use the Event Router
 * 
 * This demonstrates the event flow when a user submits a promo link
 */

import { eventRouter } from '../src/event-router.js';
import type { LinkScanResult } from '@tiltcheck/types';

// ============================================
// Module 1: FreeSpinScan
// ============================================

class FreeSpinScanModule {
  constructor() {
    // Subscribe to link scan results
    eventRouter.subscribe(
      'link.scanned',
      this.handleLinkScanned.bind(this),
      'freespinscan'
    );
  }

  async submitPromo(url: string, userId: string, bonusType: string) {
    console.log(`[FreeSpinScan] User ${userId} submitted promo: ${url}`);

    // Publish event requesting link scan
    await eventRouter.publish(
      'promo.submitted',
      'freespinscan',
      { url, userId, bonusType },
      userId
    );
  }

  private async handleLinkScanned(event: any) {
    const { url, riskLevel }: LinkScanResult = event.data;

    console.log(`[FreeSpinScan] Link scan result: ${url} is ${riskLevel}`);

    if (riskLevel === 'safe' || riskLevel === 'suspicious') {
      // Auto-approve safe links
      await eventRouter.publish(
        'promo.approved',
        'freespinscan',
        { url },
        event.userId
      );
    } else {
      // Flag risky links for mod review
      console.log(`[FreeSpinScan] ⚠️  Flagging ${url} for mod review`);
    }
  }
}

// ============================================
// Module 2: SusLink
// ============================================

class SusLinkModule {
  constructor() {
    // Subscribe to promo submissions to scan them
    eventRouter.subscribe(
      'promo.submitted',
      this.handlePromoSubmission.bind(this),
      'suslink'
    );
  }

  private async handlePromoSubmission(event: any) {
    const { url, userId } = event.data;

    console.log(`[SusLink] Scanning link: ${url}`);

    // Simulate link scanning
    const result = await this.scanLink(url);

    // Publish scan result
    await eventRouter.publish(
      'link.scanned',
      'suslink',
      result,
      userId
    );

    // If high risk, also flag it
    if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
      await eventRouter.publish(
        'link.flagged',
        'suslink',
        { url, riskLevel: result.riskLevel, reason: result.reason },
        userId
      );
    }
  }

  private async scanLink(url: string): Promise<LinkScanResult> {
    // Simplified scan logic
    const isSuspicious = url.includes('scam') || url.includes('phishing');

    return {
      url,
      riskLevel: isSuspicious ? 'critical' : 'safe',
      reason: isSuspicious ? 'Suspicious domain detected' : 'Clean',
      scannedAt: new Date(),
    };
  }
}

// ============================================
// Module 3: Casino Trust Engine
// ============================================

class CasinoTrustEngine {
  private trustScores: Map<string, number> = new Map();

  constructor() {
    // Subscribe to flagged links
    eventRouter.subscribe(
      'link.flagged',
      this.handleFlaggedLink.bind(this),
      'trust-engine-casino'
    );

    // Subscribe to approved promos
    eventRouter.subscribe(
      'promo.approved',
      this.handleApprovedPromo.bind(this),
      'trust-engine-casino'
    );
  }

  private async handleFlaggedLink(event: any) {
    const { url } = event.data;

    // Extract casino from URL (simplified)
    const casino = this.extractCasino(url);

    if (casino) {
      console.log(`[CasinoTrust] Lowering trust for ${casino} due to flagged link`);
      this.updateTrust(casino, -5);

      await eventRouter.publish(
        'trust.casino.updated',
        'trust-engine-casino',
        {
          casinoName: casino,
          previousScore: this.getTrust(casino),
          // local updateTrust already applied delta
          newScore: this.getTrust(casino),
          delta: -5,
          severity: 2,
          reason: 'Flagged risky link',
          source: 'trust-engine-casino'
        }
      );
    }
  }

  private async handleApprovedPromo(event: any) {
    const { url } = event.data;
    const casino = this.extractCasino(url);

    if (casino) {
      console.log(`[CasinoTrust] Increasing trust for ${casino} due to valid promo`);
      this.updateTrust(casino, +1);

      await eventRouter.publish(
        'trust.casino.updated',
        'trust-engine-casino',
        {
          casinoName: casino,
          previousScore: this.getTrust(casino),
          newScore: this.getTrust(casino),
          delta: +1,
          severity: 1,
          reason: 'Valid promo submitted',
          source: 'trust-engine-casino'
        }
      );
    }
  }

  private extractCasino(url: string): string | null {
    // Simplified casino extraction
    const match = url.match(/https?:\/\/([^/]+)/);
    return match ? match[1] : null;
  }

  private updateTrust(casino: string, delta: number): void {
    const current = this.trustScores.get(casino) || 75;
    const newScore = Math.max(0, Math.min(100, current + delta));
    this.trustScores.set(casino, newScore);
    console.log(`[CasinoTrust] ${casino} trust: ${current} → ${newScore}`);
  }

  getTrust(casino: string): number {
    return this.trustScores.get(casino) || 75;
  }
}

// ============================================
// Run Example
// ============================================

async function runExample() {
  console.log('='.repeat(60));
  console.log('TiltCheck Event Router Example');
  console.log('='.repeat(60));
  console.log('');

  // Initialize modules
  const freeSpinScan = new FreeSpinScanModule();
  // Modules initialized but not used in this example
  // const susLink = new SusLinkModule();
  // const casinoTrust = new CasinoTrustEngine();

  // Wait a bit for subscriptions to register
  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log('Modules initialized ✅');
  console.log('');
  console.log('Subscriptions:');
  console.log(eventRouter.getStats());
  console.log('');
  console.log('-'.repeat(60));
  console.log('');

  // Example 1: User submits a safe promo
  console.log('Example 1: Safe Promo Link');
  console.log('');
  await freeSpinScan.submitPromo(
    'https://stake.com/free-spins',
    'user123',
    'free_spins'
  );

  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log('');
  console.log('-'.repeat(60));
  console.log('');

  // Example 2: User submits a scam link
  console.log('Example 2: Scam Link');
  console.log('');
  await freeSpinScan.submitPromo(
    'https://scam-casino.com/phishing',
    'user456',
    'free_spins'
  );

  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log('');
  console.log('-'.repeat(60));
  console.log('');

  // Show final stats
  console.log('Final Stats:');
  console.log(eventRouter.getStats());
  console.log('');

  console.log('Event History (last 10):');
  const history = eventRouter.getHistory({ limit: 10 });
  history.forEach((e: any) => {
    console.log(`  ${e.type} from ${e.source} at ${new Date(e.timestamp).toISOString()}`);
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('Example Complete ✅');
  console.log('='.repeat(60));
}

// Run if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}
