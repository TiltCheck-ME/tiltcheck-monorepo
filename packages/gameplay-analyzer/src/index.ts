/**
 * TiltCheck Gameplay Analyzer
 * 
 * Real-time analysis of casino gameplay to detect RTP drift, unfair patterns,
 * and mathematical anomalies that indicate rigged games or unfair treatment.
 */

export interface SpinEvent {
  timestamp: number;
  gameId: string;
  casinoId: string;
  userId: string;
  bet: number;
  payout: number;
  symbols?: string[];
  bonusRound?: boolean;
  freeSpins?: boolean;
  multiplier?: number;
  sessionId: string;
}

export interface SessionStats {
  sessionId: string;
  userId: string;
  casinoId: string;
  gameId: string;
  startTime: number;
  endTime?: number;
  totalSpins: number;
  totalWagered: number;
  totalPayout: number;
  actualRTP: number;
  biggestWin: number;
  biggestLoss: number;
  streaks: {
    longestWinStreak: number;
    longestLossStreak: number;
    currentStreak: number;
    currentStreakType: 'win' | 'loss' | 'none';
  };
  volatility: number;
}

export interface AnomalyDetection {
  type: 'rtp_drift' | 'pump_and_dump' | 'compression' | 'clustering' | 'impossible_odds' | 'bonus_suppression';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  evidence: string[];
  detectedAt: number;
  sessionStats: SessionStats;
  recommendation: string;
}

export interface RTpAnalysis {
  expectedRTP: number;
  actualRTP: number;
  deviation: number;
  deviationPercent: number;
  isSignificant: boolean;
  sampleSize: number;
  confidenceLevel: number;
}

/**
 * Gameplay Analyzer Engine
 */
export class GameplayAnalyzer {
  private sessions: Map<string, SpinEvent[]> = new Map();
  private expectedRTPs: Map<string, number> = new Map(); // gameId -> expected RTP
  
  constructor() {
    // Initialize with known expected RTPs for common games
    this.initializeExpectedRTPs();
  }
  
  private initializeExpectedRTPs() {
    // Common slot RTPs (can be loaded from database)
    this.expectedRTPs.set('gates-of-olympus', 0.96);
    this.expectedRTPs.set('sugar-rush', 0.965);
    this.expectedRTPs.set('sweet-bonanza', 0.963);
    this.expectedRTPs.set('dog-house', 0.96);
    this.expectedRTPs.set('wanted-dead-or-alive', 0.96);
    // Default for unknown games
    this.expectedRTPs.set('default', 0.96);
  }
  
  /**
   * Record a single spin event
   */
  recordSpin(event: SpinEvent): void {
    if (!this.sessions.has(event.sessionId)) {
      this.sessions.set(event.sessionId, []);
    }
    this.sessions.get(event.sessionId)!.push(event);
  }
  
  /**
   * Calculate session statistics
   */
  calculateSessionStats(sessionId: string): SessionStats | null {
    const spins = this.sessions.get(sessionId);
    if (!spins || spins.length === 0) return null;
    
    const totalWagered = spins.reduce((sum, spin) => sum + spin.bet, 0);
    const totalPayout = spins.reduce((sum, spin) => sum + spin.payout, 0);
    const actualRTP = totalWagered > 0 ? totalPayout / totalWagered : 0;
    
    let biggestWin = 0;
    let biggestLoss = 0;
    let currentStreak = 0;
    let currentStreakType: 'win' | 'loss' | 'none' = 'none';
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    
    spins.forEach(spin => {
      const netResult = spin.payout - spin.bet;
      
      if (netResult > biggestWin) biggestWin = netResult;
      if (netResult < biggestLoss) biggestLoss = Math.abs(netResult);
      
      // Track streaks
      if (netResult > 0) {
        if (currentStreakType === 'win') {
          currentStreak++;
        } else {
          currentStreakType = 'win';
          currentStreak = 1;
        }
        if (currentStreak > longestWinStreak) longestWinStreak = currentStreak;
      } else if (netResult < 0) {
        if (currentStreakType === 'loss') {
          currentStreak++;
        } else {
          currentStreakType = 'loss';
          currentStreak = 1;
        }
        if (currentStreak > longestLossStreak) longestLossStreak = currentStreak;
      } else {
        currentStreak = 0;
        currentStreakType = 'none';
      }
    });
    
    // Calculate volatility (standard deviation of returns)
    const returns = spins.map(spin => (spin.payout - spin.bet) / spin.bet);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    return {
      sessionId,
      userId: spins[0].userId,
      casinoId: spins[0].casinoId,
      gameId: spins[0].gameId,
      startTime: spins[0].timestamp,
      endTime: spins[spins.length - 1].timestamp,
      totalSpins: spins.length,
      totalWagered,
      totalPayout,
      actualRTP,
      biggestWin,
      biggestLoss,
      streaks: {
        longestWinStreak,
        longestLossStreak,
        currentStreak,
        currentStreakType
      },
      volatility
    };
  }
  
  /**
   * Analyze RTP deviation from expected
   */
  analyzeRTP(sessionId: string): RTpAnalysis | null {
    const stats = this.calculateSessionStats(sessionId);
    if (!stats) return null;
    
    const expectedRTP = this.expectedRTPs.get(stats.gameId) || this.expectedRTPs.get('default')!;
    const deviation = stats.actualRTP - expectedRTP;
    const deviationPercent = (deviation / expectedRTP) * 100;
    
    // Statistical significance test (simplified)
    // Real implementation would use proper confidence intervals
    const sampleSize = stats.totalSpins;
    const confidenceLevel = this.calculateConfidenceLevel(sampleSize, Math.abs(deviation));
    const isSignificant = Math.abs(deviationPercent) > 5 && sampleSize > 50 && confidenceLevel > 0.95;
    
    return {
      expectedRTP,
      actualRTP: stats.actualRTP,
      deviation,
      deviationPercent,
      isSignificant,
      sampleSize,
      confidenceLevel
    };
  }
  
  /**
   * Calculate statistical confidence level
   */
  private calculateConfidenceLevel(sampleSize: number, deviation: number): number {
    // Simplified confidence calculation
    // Real implementation would use proper statistical tests
    if (sampleSize < 30) return 0.5;
    if (sampleSize < 100) return 0.8;
    if (sampleSize < 500) return 0.9;
    if (sampleSize >= 1000 && deviation > 0.05) return 0.99;
    return 0.95;
  }
  
  /**
   * Detect anomalies in gameplay
   */
  detectAnomalies(sessionId: string): AnomalyDetection[] {
    const stats = this.calculateSessionStats(sessionId);
    if (!stats) return [];
    
    const anomalies: AnomalyDetection[] = [];
    const rtpAnalysis = this.analyzeRTP(sessionId);
    const spins = this.sessions.get(sessionId)!;
    
    // 1. RTP Drift Detection
    if (rtpAnalysis && rtpAnalysis.isSignificant) {
      const severity: AnomalyDetection['severity'] = 
        Math.abs(rtpAnalysis.deviationPercent) > 15 ? 'critical' :
        Math.abs(rtpAnalysis.deviationPercent) > 10 ? 'high' :
        Math.abs(rtpAnalysis.deviationPercent) > 7 ? 'medium' : 'low';
      
      anomalies.push({
        type: 'rtp_drift',
        severity,
        confidence: rtpAnalysis.confidenceLevel,
        evidence: [
          `Expected RTP: ${(rtpAnalysis.expectedRTP * 100).toFixed(2)}%`,
          `Actual RTP: ${(rtpAnalysis.actualRTP * 100).toFixed(2)}%`,
          `Deviation: ${rtpAnalysis.deviationPercent.toFixed(2)}%`,
          `Sample size: ${rtpAnalysis.sampleSize} spins`
        ],
        detectedAt: Date.now(),
        sessionStats: stats,
        recommendation: rtpAnalysis.deviation < 0 
          ? 'Player is experiencing significantly below-expected returns. Consider investigating game fairness.'
          : 'Player is experiencing above-expected returns (rare but possible). Monitor for compensation later.'
      });
    }
    
    // 2. Pump and Dump Detection
    const pumpAndDump = this.detectPumpAndDump(spins);
    if (pumpAndDump) {
      anomalies.push({
        type: 'pump_and_dump',
        severity: pumpAndDump.severity,
        confidence: pumpAndDump.confidence,
        evidence: pumpAndDump.evidence,
        detectedAt: Date.now(),
        sessionStats: stats,
        recommendation: 'Classic "hook and hold" pattern detected. Game may be engineered to give early wins followed by sustained losses.'
      });
    }
    
    // 3. RTP Compression (payouts always near break-even)
    const compression = this.detectCompression(spins);
    if (compression) {
      anomalies.push({
        type: 'compression',
        severity: compression.severity,
        confidence: compression.confidence,
        evidence: compression.evidence,
        detectedAt: Date.now(),
        sessionStats: stats,
        recommendation: 'Payouts are suspiciously compressed around break-even. This reduces variance and limits big win potential.'
      });
    }
    
    // 4. Clustering Detection (wins/losses in suspicious patterns)
    const clustering = this.detectClustering(spins);
    if (clustering) {
      anomalies.push({
        type: 'clustering',
        severity: clustering.severity,
        confidence: clustering.confidence,
        evidence: clustering.evidence,
        detectedAt: Date.now(),
        sessionStats: stats,
        recommendation: 'Non-random clustering of wins/losses detected. May indicate predetermined outcome sequences.'
      });
    }
    
    // 5. Bonus Suppression (bonus rounds triggered far below expected rate)
    const bonusSuppression = this.detectBonusSuppression(spins);
    if (bonusSuppression) {
      anomalies.push({
        type: 'bonus_suppression',
        severity: bonusSuppression.severity,
        confidence: bonusSuppression.confidence,
        evidence: bonusSuppression.evidence,
        detectedAt: Date.now(),
        sessionStats: stats,
        recommendation: 'Bonus rounds are triggering significantly below expected frequency. This is a common rigging technique.'
      });
    }
    
    // 6. Impossible Odds (mathematically impossible symbol combinations)
    const impossibleOdds = this.detectImpossibleOdds(spins);
    if (impossibleOdds) {
      anomalies.push({
        type: 'impossible_odds',
        severity: 'critical',
        confidence: impossibleOdds.confidence,
        evidence: impossibleOdds.evidence,
        detectedAt: Date.now(),
        sessionStats: stats,
        recommendation: 'CRITICAL: Mathematically impossible outcomes detected. Game is likely rigged or malfunctioning.'
      });
    }
    
    return anomalies;
  }
  
  /**
   * Detect pump and dump pattern
   */
  private detectPumpAndDump(spins: SpinEvent[]): { severity: AnomalyDetection['severity']; confidence: number; evidence: string[] } | null {
    if (spins.length < 50) return null;
    
    // Split into early and late phases
    const earlyPhase = spins.slice(0, Math.floor(spins.length * 0.2)); // First 20%
    const latePhase = spins.slice(Math.floor(spins.length * 0.2)); // Last 80%
    
    const earlyRTP = this.calculateRTPForSpins(earlyPhase);
    const lateRTP = this.calculateRTPForSpins(latePhase);
    
    // Pump and dump: Early RTP significantly higher than late RTP
    const rtpDrop = earlyRTP - lateRTP;
    
    if (rtpDrop > 0.15) { // 15% drop
      return {
        severity: rtpDrop > 0.25 ? 'critical' : rtpDrop > 0.20 ? 'high' : 'medium',
        confidence: 0.85,
        evidence: [
          `Early phase RTP: ${(earlyRTP * 100).toFixed(2)}%`,
          `Late phase RTP: ${(lateRTP * 100).toFixed(2)}%`,
          `RTP drop: ${(rtpDrop * 100).toFixed(2)}%`,
          'Classic "hook" pattern: high early returns to keep player engaged, then sustained losses'
        ]
      };
    }
    
    return null;
  }
  
  /**
   * Detect compression (payouts compressed around break-even)
   */
  private detectCompression(spins: SpinEvent[]): { severity: AnomalyDetection['severity']; confidence: number; evidence: string[] } | null {
    if (spins.length < 100) return null;
    
    const returns = spins.map(spin => (spin.payout - spin.bet) / spin.bet);
    
    // Count spins with returns near zero (-10% to +10%)
    const compressedSpins = returns.filter(r => Math.abs(r) < 0.1).length;
    const compressionRate = compressedSpins / returns.length;
    
    // Also check variance - should be low for compressed payouts
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    
    if (compressionRate > 0.6 && variance < 0.5) { // 60%+ near-breakeven, low variance
      return {
        severity: compressionRate > 0.75 ? 'high' : 'medium',
        confidence: 0.8,
        evidence: [
          `${(compressionRate * 100).toFixed(1)}% of spins near break-even`,
          `Variance: ${variance.toFixed(3)} (unusually low)`,
          'Expected: More distributed wins/losses with higher variance',
          'Actual: Artificially compressed payouts limiting big win potential'
        ]
      };
    }
    
    return null;
  }
  
  /**
   * Detect non-random clustering
   */
  private detectClustering(spins: SpinEvent[]): { severity: AnomalyDetection['severity']; confidence: number; evidence: string[] } | null {
    if (spins.length < 100) return null;
    
    // Analyze win/loss sequences for patterns
    const isWin = spins.map(spin => spin.payout > spin.bet);
    
    // Count runs (consecutive wins or losses)
    let runs: number[] = [];
    let currentRun = 1;
    for (let i = 1; i < isWin.length; i++) {
      if (isWin[i] === isWin[i - 1]) {
        currentRun++;
      } else {
        runs.push(currentRun);
        currentRun = 1;
      }
    }
    runs.push(currentRun);
    
    // Expected number of runs for random sequence
    const n = isWin.length;
    const nWins = isWin.filter(w => w).length;
    const expectedRuns = (2 * nWins * (n - nWins)) / n + 1;
    const actualRuns = runs.length;
    
    // Z-score for runs test
    const variance = (2 * nWins * (n - nWins) * (2 * nWins * (n - nWins) - n)) / (n * n * (n - 1));
    const zScore = Math.abs((actualRuns - expectedRuns) / Math.sqrt(variance));
    
    // Z-score > 2.5 indicates non-random clustering (p < 0.01)
    if (zScore > 2.5) {
      return {
        severity: zScore > 4 ? 'high' : 'medium',
        confidence: Math.min(0.99, zScore / 5),
        evidence: [
          `Expected runs: ${expectedRuns.toFixed(1)}`,
          `Actual runs: ${actualRuns}`,
          `Z-score: ${zScore.toFixed(2)} (indicates non-randomness)`,
          actualRuns < expectedRuns ? 'Too much clustering (streaky)' : 'Too alternating (artificial variance)'
        ]
      };
    }
    
    return null;
  }
  
  /**
   * Detect bonus suppression
   */
  private detectBonusSuppression(spins: SpinEvent[]): { severity: AnomalyDetection['severity']; confidence: number; evidence: string[] } | null {
    if (spins.length < 200) return null; // Need larger sample
    
    const bonusSpins = spins.filter(spin => spin.bonusRound || spin.freeSpins);
    const bonusRate = bonusSpins.length / spins.length;
    
    // Expected bonus rate varies by game, but typically 1/100 to 1/200 spins
    const expectedBonusRate = 0.01; // 1/100 as baseline
    
    if (bonusRate < expectedBonusRate * 0.3) { // Less than 30% of expected
      return {
        severity: bonusRate < expectedBonusRate * 0.1 ? 'critical' : 'high',
        confidence: 0.9,
        evidence: [
          `Bonus trigger rate: ${(bonusRate * 100).toFixed(3)}%`,
          `Expected rate: ~${(expectedBonusRate * 100).toFixed(2)}%`,
          `Suppression factor: ${((1 - bonusRate / expectedBonusRate) * 100).toFixed(1)}%`,
          `Sample size: ${spins.length} spins`
        ]
      };
    }
    
    return null;
  }
  
  /**
   * Detect impossible odds
   */
  private detectImpossibleOdds(spins: SpinEvent[]): { confidence: number; evidence: string[] } | null {
    // This requires game-specific symbol probability knowledge
    // For now, detect obvious impossibilities
    
    const impossibilities: string[] = [];
    
    spins.forEach((spin, idx) => {
      // Check for repeated exact symbol combinations (extremely rare)
      if (spin.symbols && spin.symbols.length > 0) {
        const symbolString = spin.symbols.join(',');
        const sameSymbolSpins = spins.filter((s, i) => 
          i !== idx && s.symbols && s.symbols.join(',') === symbolString
        );
        
        if (sameSymbolSpins.length > 3) {
          impossibilities.push(`Exact symbol combination repeated ${sameSymbolSpins.length + 1} times: ${symbolString}`);
        }
      }
      
      // Check for impossible win amounts (e.g., 1000x bet on a 500x max game)
      // This requires game-specific max win knowledge
    });
    
    if (impossibilities.length > 0) {
      return {
        confidence: 0.95,
        evidence: impossibilities
      };
    }
    
    return null;
  }
  
  /**
   * Helper: Calculate RTP for a subset of spins
   */
  private calculateRTPForSpins(spins: SpinEvent[]): number {
    const totalWagered = spins.reduce((sum, spin) => sum + spin.bet, 0);
    const totalPayout = spins.reduce((sum, spin) => sum + spin.payout, 0);
    return totalWagered > 0 ? totalPayout / totalWagered : 0;
  }
  
  /**
   * Generate a comprehensive fairness report
   */
  generateFairnessReport(sessionId: string): {
    sessionStats: SessionStats | null;
    rtpAnalysis: RTpAnalysis | null;
    anomalies: AnomalyDetection[];
    verdict: 'fair' | 'suspicious' | 'unfair' | 'rigged';
    riskScore: number; // 0-100
    recommendations: string[];
  } {
    const sessionStats = this.calculateSessionStats(sessionId);
    const rtpAnalysis = this.analyzeRTP(sessionId);
    const anomalies = this.detectAnomalies(sessionId);
    
    // Calculate risk score based on anomalies
    let riskScore = 0;
    anomalies.forEach(anomaly => {
      const severityWeight = {
        low: 10,
        medium: 25,
        high: 50,
        critical: 75
      };
      riskScore += severityWeight[anomaly.severity] * anomaly.confidence;
    });
    riskScore = Math.min(100, riskScore);
    
    // Determine verdict
    let verdict: 'fair' | 'suspicious' | 'unfair' | 'rigged';
    if (riskScore < 20) verdict = 'fair';
    else if (riskScore < 50) verdict = 'suspicious';
    else if (riskScore < 80) verdict = 'unfair';
    else verdict = 'rigged';
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (anomalies.length === 0) {
      recommendations.push('No significant anomalies detected. Game appears to be functioning normally.');
    } else {
      recommendations.push(`${anomalies.length} anomal${anomalies.length > 1 ? 'ies' : 'y'} detected. Review detailed findings.`);
      
      if (anomalies.some(a => a.type === 'rtp_drift' && a.severity === 'critical')) {
        recommendations.push('CRITICAL: Severe RTP drift detected. Consider stopping play immediately.');
      }
      if (anomalies.some(a => a.type === 'impossible_odds')) {
        recommendations.push('CRITICAL: Impossible outcomes detected. Game is likely malfunctioning or rigged.');
      }
      if (anomalies.some(a => a.type === 'pump_and_dump')) {
        recommendations.push('Pump and dump pattern detected. This is a known rigging technique to maximize player losses.');
      }
      if (sessionStats && sessionStats.totalSpins > 500 && rtpAnalysis && rtpAnalysis.actualRTP < 0.85) {
        recommendations.push('Sustained below-expected RTP over large sample. Consider reporting to casino and/or regulators.');
      }
    }
    
    return {
      sessionStats,
      rtpAnalysis,
      anomalies,
      verdict,
      riskScore,
      recommendations
    };
  }
  
  /**
   * Clear session data (for memory management)
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
  
  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

// Export singleton instance
export const gameplayAnalyzer = new GameplayAnalyzer();
