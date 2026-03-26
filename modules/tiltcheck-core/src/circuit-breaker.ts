/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Circuit Breaker Engine
 * 
 * Detects and intervenes during high-risk gambling sessions (the "Rinse Cycle").
 * Applies "Strategic Friction" based on real-time telemetry and behavioral triggers.
 */

import { eventRouter } from '@tiltcheck/event-router';
import type { UserActivity } from './types.js';
import type { SafetyInterventionTriggeredEventData } from '@tiltcheck/types';
import { analyzeSentiment } from '@tiltcheck/utils';

export class CircuitBreaker {
  private static instance: CircuitBreaker;
  
  public static getInstance(): CircuitBreaker {
    if (!CircuitBreaker.instance) {
      CircuitBreaker.instance = new CircuitBreaker();
    }
    return CircuitBreaker.instance;
  }

  /**
   * Analyzes real-time telemetry and triggers interventions if necessary.
   */
  public async analyze(userId: string, activity: UserActivity): Promise<void> {
    const { 
      currentBalance = 0, 
      peakBalance = 0, 
      initialDeposit = 0, 
      messages = [],
      betVelocity = 0,
      lossStreak = 0 
    } = activity;

    // --- 1. THE HEATER (Strategic Friction for Wins) ---
    // Trigger if balance is 50x the initial deposit
    if (initialDeposit > 0 && currentBalance >= initialDeposit * 50) {
      await this.triggerIntervention(userId, {
        riskScore: 30,
        interventionLevel: 'CAUTION',
        action: 'PROFITS_VAULTED',
        displayText: `Landon, you are in the 0.001% of luck. This is life-changing capital. I've initiated the Profit Vault protocol to secure your bag. Confirm now to send the majority ($${(currentBalance * 0.8).toFixed(2)}) to your cold wallet before you let it bleed.`,
        telemetrySnapshot: {
          balance: currentBalance,
          peak: peakBalance,
          velocity: betVelocity,
          sentiment: 'neutral'
        }
      });
      return;
    }

    // --- 2. POSITIVE TILT (Cautionary Nudge for win streaks) ---
    // Trigger if on a win streak (negative loss streak) and increasing bet size
    // Note: UserActivity doesn't explicitly track win streaks, but we can detect no losses + baseline increases
    if (lossStreak === 0 && activity.recentBets.length > 5) {
      const last5 = activity.recentBets.slice(-5);
      const allWon = last5.every(b => b.won);
      const increasing = last5[4].amount > last5[0].amount * 1.5;

      if (allWon && increasing) {
        await this.triggerIntervention(userId, {
          riskScore: 45,
          interventionLevel: 'CAUTION',
          action: 'OVERLAY_MESSAGE',
          displayText: `Win streak > 5. Bet sizes are creeping. Mathematical variance tells me your "luck" is about to revert to the mean. Stay grounded. Don't recycle this profit back to the house.`,
          telemetrySnapshot: {
            balance: currentBalance,
            peak: peakBalance,
            velocity: betVelocity,
            sentiment: 'positive_tilt'
          }
        });
        return;
      }
    }

    // --- 3. THE CHASE (Urgent Friction for loss chasing) ---
    // Trigger if balance dropped 20% from peak and velocity is spiking
    if (peakBalance > 0 && currentBalance < peakBalance * 0.8 && betVelocity > 1.5) {
      await this.triggerIntervention(userId, {
        riskScore: 85,
        interventionLevel: 'WARNING',
        action: 'COOLDOWN_LOCK',
        displayText: `CHASE ALERT. You've dropped 20% from your peak ($$${peakBalance.toFixed(2)}) and your bet velocity is spiking ($${betVelocity.toFixed(2)}/min). You're spiraling. I'm imposing a mandatory 15-minute cooldown. Go drink water. Walk away. This is how the rinse starts.`,
        telemetrySnapshot: {
          balance: currentBalance,
          peak: peakBalance,
          velocity: betVelocity,
          sentiment: 'chase'
        }
      });
      return;
    }

    // --- 4. THE CRISIS (Protective intervention for mental breakage) ---
    // Trigger based on sentiment analysis of messages
    for (const msg of messages.slice(-5)) { // Check last 5 messages for rapid sentiment detection
      const analysis = analyzeSentiment(msg.content);
      
      if (analysis.stage !== 'NEUTRAL' && analysis.stage !== 'EUPHORIA') {
        // Map sentiment stage to intervention level
        const stageConfigs: Record<string, { level: 'CAUTION' | 'WARNING' | 'CRITICAL', score: number }> = {
          'DESPERATION': { level: 'WARNING' as const, score: 65 },
          'BREAKING_POINT': { level: 'CRITICAL' as const, score: 90 },
          'FINAL_EXIT': { level: 'CRITICAL' as const, score: 100 }
        };

        const config = stageConfigs[analysis.stage];
        if (!config) continue;

        // Custom handling for FINAL_EXIT
        let action: 'COOLDOWN_LOCK' | 'SELF_EXCLUDE_PROMPT' | 'OVERLAY_MESSAGE' | 'PROFITS_VAULTED' = 'SELF_EXCLUDE_PROMPT';
        let text = `CRISIS DETECTED (${analysis.stage}). My monitors flagged high-risk language in your chat: "${analysis.detectedKeywords.join(', ')}". One more bet is a mistake. Step back now.`;

        if (analysis.stage === 'FINAL_EXIT') {
          text = `EXIT PROTOCOL ACTIVATED. You mentioned "${analysis.detectedKeywords[0]}". Stop the bleeding now. I've sent a direct link to the Self-Exclusion API and notified your Accountabilibuddy. Zero Drift starts now.`;
        } else if (analysis.stage === 'DESPERATION') {
          action = 'COOLDOWN_LOCK';
          text = `THE CHASE DETECTED. You are showing signs of desperation: "${analysis.detectedKeywords.join(', ')}". I'm locking the vault for 30 minutes to reset your brain chemistry. Logic or Luck—you have neither right now.`;
        }

        await this.triggerIntervention(userId, {
          riskScore: config.score,
          interventionLevel: config.level,
          action,
          displayText: text,
          telemetrySnapshot: {
            balance: currentBalance,
            peak: peakBalance,
            velocity: betVelocity,
            sentiment: analysis.stage.toLowerCase() as any
          }
        });
        return;
      }
    }
  }

  /**
   * Publishes the intervention event and logs it.
   */
  private async triggerIntervention(
    userId: string, 
    data: Omit<SafetyInterventionTriggeredEventData, 'userId'>
  ): Promise<void> {
    await eventRouter.publish('safety.intervention.triggered', 'tiltcheck-core', {
      ...data,
      userId,
      metadata: {
        timestamp: Date.now(),
        source: 'CircuitBreakerEngine'
      }
    });

    console.log(`[CircuitBreaker] Intervention triggered for ${userId}: ${data.interventionLevel} - ${data.action}`);
  }
}

export const circuitBreaker = CircuitBreaker.getInstance();
