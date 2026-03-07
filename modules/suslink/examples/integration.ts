/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Complete Integration Example:
 * SusLink + Event Router + FreeSpinScan Simulation
 * 
 * This demonstrates how modules work together through events.
 * 
 * Run with: npx tsx modules/suslink/examples/integration.ts
 */

import { eventRouter } from '@tiltcheck/event-router';
import '../src/index'; // Initialize SusLink module
import type { LinkScanResult } from '@tiltcheck/types';

// Simulate FreeSpinScan module
class MockFreeSpinScan {
  private approvedPromos: string[] = [];
  private flaggedPromos: string[] = [];

  constructor() {
    // Subscribe to scan results
    eventRouter.subscribe(
      'link.scanned',
      this.handleLinkScanned.bind(this),
      'freespinscan'
    );

    console.log('[FreeSpinScan] Ready to process promos');
  }

  async submitPromo(url: string, userId: string, bonusType: string) {
    console.log(`\n[FreeSpinScan] User ${userId} submitted: ${url}`);
    
    // Publish promo submission (SusLink will scan it)
    await eventRouter.publish(
      'promo.submitted',
      'freespinscan',
      { url, userId, bonusType },
      userId
    );
  }

  private async handleLinkScanned(event: any) {
    const { url, riskLevel, reason }: LinkScanResult = event.data;
    
    console.log(`[FreeSpinScan] Scan result for ${url}:`);
    console.log(`  Risk: ${riskLevel}`);
    console.log(`  Reason: ${reason}`);

    if (riskLevel === 'safe' || riskLevel === 'suspicious') {
      // Auto-approve safe links
      this.approvedPromos.push(url);
      console.log(`[FreeSpinScan] ✅ Auto-approved (${riskLevel})`);
      
      await eventRouter.publish(
        'promo.approved',
        'freespinscan',
        { url },
        event.userId
      );
    } else {
      // Flag high-risk for mod review
      this.flaggedPromos.push(url);
      console.log(`[FreeSpinScan] 🚨 Flagged for mod review (${riskLevel})`);
    }
  }

  getStats() {
    return {
      approved: this.approvedPromos.length,
      flagged: this.flaggedPromos.length,
    };
  }
}

// Simulate Casino Trust Engine
class MockCasinoTrust {
  private trustScores = new Map<string, number>();

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

    console.log('[CasinoTrust] Monitoring casino behavior');
  }

  private async handleFlaggedLink(event: any) {
    const { url, riskLevel } = event.data;
    const casino = this.extractCasino(url);

    if (casino) {
      const penalty = riskLevel === 'critical' ? -10 : -5;
      this.adjustTrust(casino, penalty);
      console.log(`[CasinoTrust] ${casino} trust ${penalty} (flagged link)`);
    }
  }

  private async handleApprovedPromo(event: any) {
    const { url } = event.data;
    const casino = this.extractCasino(url);

    if (casino) {
      this.adjustTrust(casino, +1);
      console.log(`[CasinoTrust] ${casino} trust +1 (valid promo)`);
    }
  }

  private extractCasino(url: string): string | null {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return null;
    }
  }

  private adjustTrust(casino: string, delta: number) {
    const current = this.trustScores.get(casino) || 75;
    const newScore = Math.max(0, Math.min(100, current + delta));
    this.trustScores.set(casino, newScore);
  }

  getTrust(casino: string): number {
    return this.trustScores.get(casino) || 75;
  }

  getAllScores() {
    return Object.fromEntries(this.trustScores);
  }
}

// Main example
async function runIntegration() {
  console.log('='.repeat(70));
  console.log('TiltCheck Integration Example');
  console.log('SusLink + Event Router + FreeSpinScan + Casino Trust');
  console.log('='.repeat(70));

  // Initialize modules
  const freeSpinScan = new MockFreeSpinScan();
  const casinoTrust = new MockCasinoTrust();

  // Wait a bit for subscriptions
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\n' + '-'.repeat(70));
  console.log('Submitting Test Promos');
  console.log('-'.repeat(70));

  // Test 1: Safe promo
  await freeSpinScan.submitPromo(
    'https://stake.com/promotions/free-spins',
    'user123',
    'free_spins'
  );
  await new Promise(resolve => setTimeout(resolve, 200));

  // Test 2: Suspicious but okayish
  await freeSpinScan.submitPromo(
    'https://rollbit-bonus.online/claim',
    'user456',
    'bonus'
  );
  await new Promise(resolve => setTimeout(resolve, 200));

  // Test 3: High risk - impersonation
  await freeSpinScan.submitPromo(
    'https://stakee.com/verify-account',
    'user789',
    'free_spins'
  );
  await new Promise(resolve => setTimeout(resolve, 200));

  // Test 4: Critical - obvious scam
  await freeSpinScan.submitPromo(
    'https://free-money-unlimited.tk/hack/generator',
    'user999',
    'scam'
  );
  await new Promise(resolve => setTimeout(resolve, 200));

  // Test 5: Another safe one
  await freeSpinScan.submitPromo(
    'https://bc.game/bonus',
    'user111',
    'bonus'
  );
  await new Promise(resolve => setTimeout(resolve, 200));

  // Show results
  console.log('\n' + '='.repeat(70));
  console.log('Final Results');
  console.log('='.repeat(70));

  const stats = freeSpinScan.getStats();
  console.log(`\n[FreeSpinScan] Approved: ${stats.approved}, Flagged: ${stats.flagged}`);

  console.log('\n[CasinoTrust] Trust Scores:');
  const scores = casinoTrust.getAllScores();
  for (const [casino, score] of Object.entries(scores)) {
    const emoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '🚨';
    console.log(`  ${emoji} ${casino}: ${score}/100`);
  }

  console.log('\n[EventRouter] Stats:');
  console.log(eventRouter.getStats());

  console.log('\n' + '='.repeat(70));
  console.log('Integration Test Complete! 🎉');
  console.log('='.repeat(70));
}

// Run if executed directly
if (require.main === module) {
  runIntegration().catch(console.error);
}
