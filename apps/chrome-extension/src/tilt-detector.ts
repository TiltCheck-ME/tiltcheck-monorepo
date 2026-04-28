/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
/**
 * TiltCheck - Real-time tilt detection and intervention system
 * 
 * Monitors player behavior for signs of tilt:
 * - Fast consecutive bets (rage betting)
 * - Increased bet sizes after losses (chasing)
 * - Erratic clicking patterns
 * - Playing through emotional states
 * - Session duration warnings
 * 
 * Provides interventions:
 * - Balance vaulting recommendations
 * - Cooldown suggestions
 * - "Phone a friend" prompts
 * - Real-world spending reminders ("hey, trash bags cost $X")
 * - Session break notifications
 */

export interface BehaviorEvent {
  type: 'bet' | 'click' | 'balance_change' | 'session_start' | 'session_end';
  timestamp: number;
  data?: any;
}

export interface BetEvent {
  amount: number;
  timestamp: number;
  result: 'win' | 'loss' | 'push';
  payout: number;
}

export interface TiltIndicator {
  type: 'rage_betting' | 'chasing_losses' | 'fast_clicks' | 'duration_warning' |
  'bet_escalation' | 'emotional_pattern' | 'fatigue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  description: string;
  evidence: any;
  triggeredAt: number;
}

export interface RedeemRecommendation {
  amount: number;
  threshold: number;
  message: string;
  urgency: 'medium' | 'high' | 'critical';
}

export interface VaultRecommendation {
  reason: string;
  suggestedAmount: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  realWorldComparison?: {
    item: string;
    cost: number;
    quantity: number;
    message: string;
  };
}

export interface InterventionAction {
  type: 'vault_balance' | 'cooldown' | 'phone_friend' | 'session_break' |
  'spending_reminder' | 'stop_loss_triggered' | 'redeem_nudge';
  message: string;
  actionRequired: boolean;
  data?: any;
}

export class TiltDetector {
  private bets: BetEvent[] = [];
  private clicks: number[] = []; // Timestamps of clicks
  private sessionStartTime: number = Date.now();
  private baselineAvgBet: number = 0;
  private consecutiveLosses: number = 0;
  private totalWagered: number = 0;
  private totalWon: number = 0;
  private currentBalance: number | null = null;
  private initialBalance: number | null = null;
  private redeemThreshold: number | null = null;

  // Configuration
  private config = {
    // Rage betting thresholds
    fastBetThreshold: 2000, // ms between bets
    rageBetCount: 5, // consecutive fast bets

    // Chasing losses
    betIncreaseMultiplier: 2.5, // 2.5x increase after loss
    chasingPattern: 3, // consecutive increasing bets after losses

    // Fast clicks — "Auto-Pilot Trance" detection.
    // Triggers when bet events arrive faster than 300ms apart (sub-human pacing = autopilot state).
    clickThreshold: 5, // clicks in window
    clickWindow: 300, // ms — reduced from 3000ms to detect Auto-Pilot Trance pattern

    // Session duration
    warningDuration: 60 * 60 * 1000, // 1 hour
    criticalDuration: 2 * 60 * 60 * 1000, // 2 hours

    // Vault recommendations
    vaultThreshold: 5, // 5x initial balance
    profitVaultPercent: 0.5, // Vault 50% of profits

    // Stop loss
    stopLossPercent: 0.5, // Stop at 50% loss

    // Real-world comparisons (common items people forget to buy)
    realWorldItems: [
      { item: 'trash bags', avgCost: 15 },
      { item: 'toilet paper', avgCost: 20 },
      { item: 'groceries', avgCost: 100 },
      { item: 'gas', avgCost: 50 },
      { item: 'phone bill', avgCost: 80 },
      { item: 'utilities', avgCost: 150 },
      { item: 'rent', avgCost: 1500 },
    ]
  };

  constructor(initialBalance: number | null, riskLevel: 'conservative' | 'moderate' | 'degen' = 'moderate', redeemThreshold?: number) {
    this.currentBalance = initialBalance;
    this.initialBalance = initialBalance;
    this.redeemThreshold = redeemThreshold || null;
    this.applyRiskProfile(riskLevel);
  }

  private classifyBetResult(bet: number, payout: number): BetEvent['result'] {
    if (bet <= 0) {
      return payout > 0 ? 'win' : 'push';
    }

    if (payout <= 0 || payout < bet) {
      return 'loss';
    }

    if (payout === bet) {
      return 'push';
    }

    return 'win';
  }

  /**
   * Apply risk profile configuration
   */
  private applyRiskProfile(level: string) {
    if (level === 'conservative') {
      this.config.fastBetThreshold = 3000; // stricter
      this.config.betIncreaseMultiplier = 1.5; // stricter
      this.config.warningDuration = 30 * 60 * 1000; // 30 mins
      this.config.criticalDuration = 1 * 60 * 1000; // 1 hour
      this.config.stopLossPercent = 0.3; // 30% loss
    } else if (level === 'degen') {
      this.config.fastBetThreshold = 1000; // looser
      this.config.betIncreaseMultiplier = 5; // looser
      this.config.warningDuration = 4 * 60 * 60 * 1000; // 4 hours
      this.config.criticalDuration = 8 * 60 * 60 * 1000; // 8 hours
      this.config.stopLossPercent = 0.8; // 80% loss
    }
    // Moderate is the default in the class property
  }

  /**
   * Record a bet event
   */
  recordBet(bet: number, payout: number): void {
    const now = Date.now();
    const result = this.classifyBetResult(bet, payout);

    this.bets.push({
      amount: bet,
      timestamp: now,
      result,
      payout
    });

    this.totalWagered += bet;
    this.totalWon += payout;
    if (this.currentBalance !== null) {
      this.currentBalance = this.currentBalance - bet + payout;
    }

    if (result === 'loss') {
      this.consecutiveLosses++;
    } else {
      this.consecutiveLosses = 0;
    }

    // Update baseline (average of first 10 bets)
    const baselineBets = this.bets.filter((entry) => entry.amount > 0).slice(0, 10);
    if (baselineBets.length > 0) {
      this.baselineAvgBet = baselineBets.reduce((sum, entry) => sum + entry.amount, 0) / baselineBets.length;
    }
  }

  /**
   * Update the current balance from an external source.
   */
  updateBalance(newBalance: number): void {
    if (newBalance !== this.currentBalance) {
      this.currentBalance = newBalance;
    }
  }

  setRedeemThreshold(redeemThreshold: number | null): void {
    this.redeemThreshold = redeemThreshold && redeemThreshold > 0 ? redeemThreshold : null;
  }

  /**
   * Record a click event (for erratic clicking detection)
   */
  recordClick(): void {
    const now = Date.now();
    this.clicks.push(now);

    // Keep only recent clicks (within window)
    this.clicks = this.clicks.filter(t => now - t < this.config.clickWindow);
  }

  /**
   * Detect rage betting (fast consecutive bets)
   */
  detectRageBetting(): TiltIndicator | null {
    if (this.bets.length < this.config.rageBetCount) return null;

    const recentBets = this.bets.slice(-this.config.rageBetCount);
    const intervals: number[] = [];

    for (let i = 1; i < recentBets.length; i++) {
      intervals.push(recentBets[i].timestamp - recentBets[i - 1].timestamp);
    }

    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

    if (avgInterval < this.config.fastBetThreshold) {
      const severity = avgInterval < 1000 ? 'critical' :
        avgInterval < 1500 ? 'high' : 'medium';

      return {
        type: 'rage_betting',
        severity,
        confidence: Math.min(1, this.config.fastBetThreshold / avgInterval - 1),
        description: `Betting very quickly (${(avgInterval / 1000).toFixed(1)}s between bets)`,
        evidence: {
          avgInterval,
          recentBets: recentBets.length,
          threshold: this.config.fastBetThreshold
        },
        triggeredAt: Date.now()
      };
    }

    return null;
  }

  /**
   * Detect chasing losses (increasing bets after losses)
   */
  detectChasingLosses(): TiltIndicator | null {
    if (this.bets.length < this.config.chasingPattern + 1) return null;
    if (this.consecutiveLosses < this.config.chasingPattern) return null;

    const recentBets = this.bets.slice(-this.config.chasingPattern - 1);
    const isChasing = recentBets.every((bet, i) => {
      if (i === 0) return true; // First bet
      return bet.amount > recentBets[i - 1].amount * this.config.betIncreaseMultiplier;
    });

    if (isChasing) {
      const increase = recentBets[recentBets.length - 1].amount / recentBets[0].amount;
      const severity = increase > 10 ? 'critical' :
        increase > 5 ? 'high' :
          increase > 3 ? 'medium' : 'low';

      return {
        type: 'chasing_losses',
        severity,
        confidence: Math.min(1, increase / 10),
        description: `Bet size increased ${increase.toFixed(1)}x after ${this.consecutiveLosses} losses`,
        evidence: {
          consecutiveLosses: this.consecutiveLosses,
          betIncrease: increase,
          startBet: recentBets[0].amount,
          currentBet: recentBets[recentBets.length - 1].amount
        },
        triggeredAt: Date.now()
      };
    }

    return null;
  }

  /**
   * Detect fast/erratic clicking (Auto-Pilot Trance detection).
   * At 300ms window, this fires when bet events arrive faster than humanly intentional.
   */
  detectFastClicks(): TiltIndicator | null {
    if (this.clicks.length < this.config.clickThreshold) return null;

    const recentClicks = this.clicks.filter(
      t => Date.now() - t < this.config.clickWindow
    );

    if (recentClicks.length >= this.config.clickThreshold) {
      const severity = recentClicks.length > 10 ? 'high' : 'medium';

      // Calculate the delta between the two most recent click timestamps.
      // Included in the tilt signal metadata so downstream events carry it.
      const sortedRecent = [...recentClicks].sort((a, b) => b - a);
      const lastClickDeltaMs = sortedRecent.length >= 2
        ? sortedRecent[0] - sortedRecent[1]
        : 0;

      return {
        type: 'fast_clicks',
        severity,
        confidence: Math.min(1, recentClicks.length / 10),
        description: `${recentClicks.length} clicks in ${this.config.clickWindow}ms — Auto-Pilot Trance detected`,
        evidence: {
          clickCount: recentClicks.length,
          window: this.config.clickWindow,
          last_click_delta_ms: lastClickDeltaMs
        },
        triggeredAt: Date.now()
      };
    }

    return null;
  }

  /**
   * Detect bet escalation (beyond baseline)
   */
  detectBetEscalation(): TiltIndicator | null {
    if (this.bets.filter((entry) => entry.amount > 0).length < 10 || this.baselineAvgBet <= 0) return null; // Need baseline first

    const recentBet = this.bets[this.bets.length - 1];
    if (recentBet.amount <= 0) return null;
    const escalationFactor = recentBet.amount / this.baselineAvgBet;

    if (escalationFactor > 5) {
      const severity = escalationFactor > 20 ? 'critical' :
        escalationFactor > 10 ? 'high' : 'medium';

      return {
        type: 'bet_escalation',
        severity,
        confidence: Math.min(1, escalationFactor / 20),
        description: `Bet ${escalationFactor.toFixed(1)}x larger than your average`,
        evidence: {
          currentBet: recentBet.amount,
          baselineAvg: this.baselineAvgBet,
          escalationFactor
        },
        triggeredAt: Date.now()
      };
    }

    return null;
  }

  /**
   * Detect session duration warnings
   */
  detectDurationWarning(): TiltIndicator | null {
    const duration = Date.now() - this.sessionStartTime;

    if (duration > this.config.criticalDuration) {
      return {
        type: 'duration_warning',
        severity: 'critical',
        confidence: 1.0,
        description: `You've been playing for ${(duration / 3600000).toFixed(1)} hours`,
        evidence: {
          duration,
          hours: duration / 3600000
        },
        triggeredAt: Date.now()
      };
    } else if (duration > this.config.warningDuration) {
      return {
        type: 'duration_warning',
        severity: 'medium',
        confidence: 0.8,
        description: `Session duration: ${(duration / 60000).toFixed(0)} minutes`,
        evidence: {
          duration,
          minutes: duration / 60000
        },
        triggeredAt: Date.now()
      };
    }

    return null;
  }

  /**
   * Detect Martingale Desperation pattern.
   *
   * Pattern: loss -> bet * 1.7x-2.5x -> loss -> bet * 1.7x-2.5x -> ... (3+ consecutive steps).
   * Uses 1.7x floor — real-world players rarely double exactly.
   */
  detectMartingale(): TiltIndicator | null {
    if (this.bets.length < 4) return null;

    const window = this.bets.slice(-6);
    let consecutiveSteps = 0;

    for (let i = 1; i < window.length; i++) {
      const prev = window[i - 1];
      const curr = window[i];

      const prevWasLoss = prev.result === 'loss';
      const multiplier = prev.amount > 0 ? curr.amount / prev.amount : 0;
      const isMartingaleStep = prevWasLoss && multiplier >= 1.7 && multiplier <= 2.5;

      if (isMartingaleStep) {
        consecutiveSteps++;
      } else {
        consecutiveSteps = 0;
      }

      if (consecutiveSteps >= 3) {
        const increase = curr.amount / window[i - consecutiveSteps].amount;
        const severity = increase > 8 ? 'critical' : increase > 4 ? 'high' : 'medium';

        return {
          type: 'emotional_pattern',
          severity,
          confidence: Math.min(1, consecutiveSteps / 4),
          description: `Martingale pattern: ${consecutiveSteps} consecutive loss-double cycles detected`,
          evidence: {
            consecutiveSteps,
            startAmount: window[i - consecutiveSteps].amount,
            currentAmount: curr.amount,
            multiplierRange: '1.7x-2.5x',
          },
          triggeredAt: Date.now()
        };
      }
    }

    return null;
  }

  /**
   * Detect all tilt indicators
   */
  detectAllTiltSigns(): TiltIndicator[] {
    const indicators: TiltIndicator[] = [];

    const rageBetting = this.detectRageBetting();
    if (rageBetting) indicators.push(rageBetting);

    const chasing = this.detectChasingLosses();
    if (chasing) indicators.push(chasing);

    const fastClicks = this.detectFastClicks();
    if (fastClicks) indicators.push(fastClicks);

    const escalation = this.detectBetEscalation();
    if (escalation) indicators.push(escalation);

    const duration = this.detectDurationWarning();
    if (duration) indicators.push(duration);

    const martingale = this.detectMartingale();
    if (martingale) indicators.push(martingale);

    return indicators;
  }

  /**
   * Generate vault recommendation
   */
  generateVaultRecommendation(): VaultRecommendation | null {
    if (this.currentBalance === null || this.initialBalance === null || this.initialBalance <= 0) {
      return null;
    }

    const profit = this.currentBalance - this.initialBalance;
    const profitMultiple = this.currentBalance / this.initialBalance;

    // Check if balance is high enough to recommend vaulting
    if (profitMultiple >= this.config.vaultThreshold) {
      const suggestedAmount = profit * this.config.profitVaultPercent;

      // Find real-world comparison
      const comparison = this.findRealWorldComparison(suggestedAmount);

      return {
        reason: `Your balance is ${profitMultiple.toFixed(1)}x your starting amount`,
        suggestedAmount,
        urgency: profitMultiple > 10 ? 'critical' :
          profitMultiple > 7 ? 'high' : 'medium',
        realWorldComparison: comparison
      };
    }

    // Check stop-loss
    const lossPercent = (this.initialBalance - this.currentBalance) / this.initialBalance;
    if (lossPercent >= this.config.stopLossPercent) {
      return {
        reason: `You've lost ${(lossPercent * 100).toFixed(0)}% of your starting balance`,
        suggestedAmount: this.currentBalance, // Vault everything
        urgency: 'critical',
        realWorldComparison: undefined
      };
    }

    return null;
  }

  /**
   * Detect opportunity to redeem/cash out (Redeem-to-Win)
   */
  detectRedeemOpportunity(): RedeemRecommendation | null {
    if (!this.redeemThreshold || this.currentBalance === null || this.currentBalance < this.redeemThreshold) return null;

    const diff = this.currentBalance - this.redeemThreshold;
    const overshootPercent = (diff / this.redeemThreshold) * 100;

    let urgency: 'medium' | 'high' | 'critical' = 'medium';
    if (overshootPercent > 50) urgency = 'critical';
    else if (overshootPercent > 20) urgency = 'high';

    return {
      amount: this.currentBalance,
      threshold: this.redeemThreshold,
      urgency,
      message: `🎯 PROFIT GOAL REACHED! You're at $${this.currentBalance.toFixed(2)}, which is above your $${this.redeemThreshold} goal. Secure the win and cash out now!`
    };
  }

  /**
   * Find real-world item comparison
   */
  private findRealWorldComparison(amount: number): {
    item: string;
    cost: number;
    quantity: number;
    message: string;
  } | undefined {
    // Find items that are affordable with this amount
    const affordableItems = this.config.realWorldItems.filter(
      item => amount >= item.avgCost
    );

    if (affordableItems.length === 0) return undefined;

    // Pick a random affordable item
    const item = affordableItems[Math.floor(Math.random() * affordableItems.length)];
    const quantity = Math.floor(amount / item.avgCost);

    return {
      item: item.item,
      cost: item.avgCost,
      quantity,
      message: `Hey, you mentioned needing ${item.item}. Your balance is ${quantity}x what they cost - maybe pull $${item.avgCost} and grab them now?`
    };
  }

  /**
   * Generate intervention recommendations
   */
  generateInterventions(): InterventionAction[] {
    const interventions: InterventionAction[] = [];
    const tiltSigns = this.detectAllTiltSigns();
    const vaultRec = this.generateVaultRecommendation();
    const redeemRec = this.detectRedeemOpportunity();

    // Critical tilt signs = immediate cooldown
    const criticalSigns = tiltSigns.filter(t => t.severity === 'critical');
    if (criticalSigns.length > 0) {
      interventions.push({
        type: 'cooldown',
        message: `🛑 TILT DETECTED: ${criticalSigns.map(t => t.description).join(', ')}. Take a 5-minute break.`,
        actionRequired: true,
        data: { duration: 5 * 60 * 1000, tiltSigns: criticalSigns }
      });
    }

    // Multiple high-severity signs = phone a friend
    const highSigns = tiltSigns.filter(t => t.severity === 'high' || t.severity === 'critical');
    if (highSigns.length >= 2) {
      interventions.push({
        type: 'phone_friend',
        message: '📞 Multiple tilt indicators detected. Maybe call someone before continuing?',
        actionRequired: false,
        data: { tiltSigns: highSigns }
      });
    }

    // Vault recommendation
    if (vaultRec) {
      if (vaultRec.urgency === 'critical') {
        interventions.push({
          type: 'stop_loss_triggered',
          message: `⚠️ STOP LOSS: ${vaultRec.reason}. Strongly recommend vaulting your remaining balance.`,
          actionRequired: true,
          data: vaultRec
        });
      } else if (vaultRec.realWorldComparison) {
        interventions.push({
          type: 'spending_reminder',
          message: vaultRec.realWorldComparison.message,
          actionRequired: false,
          data: vaultRec
        });
      } else {
        interventions.push({
          type: 'vault_balance',
          message: `💰 ${vaultRec.reason}. Consider vaulting $${vaultRec.suggestedAmount.toFixed(2)}.`,
          actionRequired: false,
          data: vaultRec
        });
      }
    }

    // Redeem nudge (Positive Reinforcement)
    if (redeemRec) {
      interventions.push({
        type: 'redeem_nudge',
        message: redeemRec.message,
        actionRequired: true,
        data: redeemRec
      });
    }

    // Session break for duration
    const durationWarning = tiltSigns.find(t => t.type === 'duration_warning');
    if (durationWarning && durationWarning.severity === 'critical') {
      interventions.push({
        type: 'session_break',
        message: `⏰ ${durationWarning.description}. Time for a break?`,
        actionRequired: false,
        data: durationWarning
      });
    }

    return interventions;
  }

  /**
   * Get current tilt risk score (0-100)
   */
  getTiltRiskScore(): number {
    const tiltSigns = this.detectAllTiltSigns();

    const weights = {
      rage_betting: 25,
      chasing_losses: 30,
      fast_clicks: 15,
      bet_escalation: 20,
      duration_warning: 10,
      emotional_pattern: 20,
      fatigue: 15
    };

    const severityMultipliers = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
      critical: 2.0
    };

    let score = 0;
    for (const sign of tiltSigns) {
      const weight = weights[sign.type] || 10;
      const multiplier = severityMultipliers[sign.severity];
      score += weight * multiplier * sign.confidence;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const duration = Date.now() - this.sessionStartTime;
    const netProfit =
      this.currentBalance !== null && this.initialBalance !== null
        ? this.currentBalance - this.initialBalance
        : null;
    const roi =
      netProfit !== null && this.initialBalance !== null && this.initialBalance > 0
        ? (netProfit / this.initialBalance) * 100
        : null;

    return {
      duration: duration, // ms
      startTime: this.sessionStartTime,
      totalBets: this.bets.length,
      totalWagered: this.totalWagered,
      totalWon: this.totalWon,
      netProfit,
      roi,
      currentBalance: this.currentBalance,
      initialBalance: this.initialBalance,
      avgBetSize: this.bets.length > 0 ? this.totalWagered / this.bets.length : 0,
      consecutiveLosses: this.consecutiveLosses,
      tiltRisk: this.getTiltRiskScore()
    };
  }
}
