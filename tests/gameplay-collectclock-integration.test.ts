/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Integration test: Gameplay Analyzer → Trust Events → CollectClock
 * Verifies that anomaly detection impacts trust scoring and bonus claims
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventRouter } from '@tiltcheck/event-router';
import { CollectClockService } from '@tiltcheck/collectclock';
import { addTrustSignal, getProfile, getTrustBand, clearProfiles } from '@tiltcheck/identity-core';
import type { GameplayAnomalyEvent } from '@tiltcheck/types';

// Import identity-core to ensure event subscriptions are registered
import '@tiltcheck/identity-core';

describe('Gameplay Analyzer + CollectClock Integration', () => {
  let collectclock: CollectClockService;
  const testUserId = 'test-user-123';
  const testCasino = 'test-casino';

  beforeEach(() => {
    // Clear all trust profiles for clean state
    clearProfiles();
    
    // Reset collectclock with trust gating enabled
    collectclock = new CollectClockService({
      trustGating: {
        enabled: true,
        minTrustScore: 30,
        trustBandLimits: {
          RED: 1,
          YELLOW: 2,
          GREEN: 5,
          PLATINUM: 10
        }
      }
    });
    
    collectclock.registerCasino(testCasino, 100);
  });

  it('should allow bonus claim for user with good trust score', () => {
    // Setup: User has good trust (GREEN band, score ~75)
    addTrustSignal(testUserId, 'tip', 'tip_activity', 0.5, 1.0);
    
    const profile = getProfile(testUserId);
    expect(profile.trustScore).toBeGreaterThan(50);
    
    // Should allow claim
    const claim = collectclock.claimBonus(testCasino, testUserId, profile.trustScore, getTrustBand(profile.trustScore));
    expect(claim.userId).toBe(testUserId);
    expect(claim.amount).toBe(100);
  });

  it('should reject bonus claim for user with low trust score', () => {
    // Setup: User has very low trust (RED band, score < 30)
    addTrustSignal(testUserId, 'tilt', 'tilt_severity', -1, 1.0);
    
    const profile = getProfile(testUserId);
    expect(profile.trustScore).toBeLessThan(30);
    
    // Should reject claim
    expect(() => {
      collectclock.claimBonus(testCasino, testUserId, profile.trustScore, getTrustBand(profile.trustScore));
    }).toThrow(/Trust score too low/);
  });

  it('should NOT reduce degen trust score when gameplay anomaly detected', async () => {
    // Per requirements: gameplay anomalies affect casino scores, not degen scores
    // Setup: User starts with neutral trust
    const initialProfile = getProfile(testUserId);
    const initialScore = initialProfile.trustScore;
    
    // Simulate pump detection event from gameplay analyzer
    const pumpEvent: GameplayAnomalyEvent = {
      userId: testUserId,
      casinoId: 'stake-us',
      anomalyType: 'pump',
      severity: 'critical',
      confidence: 0.9,
      metadata: {
        observedRTP: 1.15,
        baselineRTP: 0.96,
        deviationRatio: 0.198,
        windowSize: 100
      },
      reason: 'RTP elevated 19.8% above baseline in 100-spin window',
      timestamp: Date.now()
    };
    
    // Publish event (affects casino trust, not degen trust)
    await eventRouter.publish('fairness.pump.detected', 'gameplay-analyzer', pumpEvent);
    
    // Wait for event processing
    const updatedProfile = getProfile(testUserId);
    
    // Degen trust should NOT have decreased
    expect(updatedProfile.trustScore).toBe(initialScore);
  });

  it('should enforce daily claim limits by trust band', () => {
    // Setup: User in YELLOW band (2 claims/day limit)
    addTrustSignal(testUserId, 'gameplay', 'rtp_drift', -0.2, 0.5);
    
    const profile = getProfile(testUserId);
    const band = getTrustBand(profile.trustScore);
    
    // First claim should succeed
    const claim1 = collectclock.claimBonus(testCasino, testUserId, profile.trustScore, band);
    expect(claim1.userId).toBe(testUserId);
    
    // Wait for cooldown (would normally be 24h, but we can manipulate state for test)
    // For now, this demonstrates the trust band check logic
    expect(band).toBe('YELLOW');
  });

  it('should publish trust.casino.updated when bonus nerf detected', async () => {
    let trustEventReceived = false;
    
    // Subscribe to trust events
    await new Promise<void>((resolve) => {
      eventRouter.subscribe('trust.casino.updated', (evt: any) => {
        if (evt.source === 'collectclock' && evt.data.reason?.includes('Bonus nerf')) {
          trustEventReceived = true;
          expect(evt.data.severity).toBeGreaterThan(0);
          resolve();
        }
      }, 'test-suite');
      
      // Trigger nerf (15%+ drop)
      collectclock.updateBonus(testCasino, 100);
      collectclock.updateBonus(testCasino, 80); // 20% drop
      
      // Give event time to propagate (fallback timeout)
      setTimeout(() => {
        resolve();
      }, 100);
    });
    
    expect(trustEventReceived).toBe(true);
  });

  it('should NOT reduce degen trust for win clustering anomaly', async () => {
    // Per requirements: gameplay anomalies affect casino scores, not degen/player scores
    // Setup: User starts neutral
    const initialProfile = getProfile(testUserId);
    const initialScore = initialProfile.trustScore; // Take a copy of the score
    
    // Simulate win clustering anomaly
    const clusterEvent: GameplayAnomalyEvent = {
      userId: testUserId,
      casinoId: 'stake-us',
      anomalyType: 'win_clustering',
      severity: 'warning',
      confidence: 0.75,
      metadata: {
        clusterScore: 0.82,
        windowSize: 100
      },
      reason: 'Abnormal win clustering detected',
      timestamp: Date.now()
    };
    
    await eventRouter.publish('fairness.cluster.detected', 'gameplay-analyzer', clusterEvent);
    
    const updatedProfile = getProfile(testUserId);
    
    // Degen trust should remain unchanged
    expect(updatedProfile.trustScore).toBe(initialScore);
  });
});
