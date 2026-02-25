/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * GameplayAnalyzer Service
 * 
 * Detects gameplay anomalies including:
 * - RTP pump (artificially high returns to hook players)
 * - Win clustering (suspicious win patterns)
 * - RTP drift (gradual deviation from expected returns)
 * 
 * Architecture:
 * - Analyzes gameplay data (spin results) in sliding windows
 * - Publishes anomaly events to trust engine via event router
 * - Supports mobile-optimized mode for battery/bandwidth efficiency
 * 
 * Mobile Considerations:
 * - Batch processing to reduce API calls
 * - Compressed payload formats
 * - Local caching of baseline data
 * - Progressive analysis (quick check → deep analysis)
 */

import { eventRouter } from '@tiltcheck/event-router';
import type { GameplayAnomalyEvent } from '@tiltcheck/types';
import type {
  SpinResult,
  RTPStats,
  ClusterStats,
  AnomalyResult,
  GameplayAnalyzerConfig,
  GameplaySession,
  MobileAnomalySummary,
  AnalysisReport,
} from './types.js';

const DEFAULT_CONFIG: GameplayAnalyzerConfig = {
  baselineRTP: 0.96,
  windowSize: 100,
  pumpThreshold: 0.10,    // 10% above baseline is suspicious
  driftThreshold: 0.05,   // 5% deviation triggers drift warning
  clusterThreshold: 0.75, // Cluster score above this is suspicious
  minSpinsRequired: 20,   // Need at least 20 spins for meaningful analysis
  autoPublish: true,
  mobileOptimized: false,
  mobileBatchSize: 25,
};

/**
 * GameplayAnalyzer Service
 * Detects RTP manipulation and suspicious win patterns
 */
export class GameplayAnalyzerService {
  private config: GameplayAnalyzerConfig;
  private sessions: Map<string, GameplaySession>;
  private baselinesByGame: Map<string, number>; // gameId -> baseline RTP
  private analysisHistory: Map<string, AnalysisReport[]>; // userId -> reports

  constructor(config: Partial<GameplayAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessions = new Map();
    this.baselinesByGame = new Map();
    this.analysisHistory = new Map();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Record a spin result for analysis
   */
  recordSpin(spin: SpinResult): void {
    const sessionKey = `${spin.userId}:${spin.casinoId}`;
    let session = this.sessions.get(sessionKey);

    if (!session) {
      session = this.createSession(spin.userId, spin.casinoId);
      this.sessions.set(sessionKey, session);
    }

    session.spins.push(spin);
    session.lastActivity = Date.now();

    // Update session RTP
    const stats = this.calculateRTPStats(session.spins);
    session.sessionRTP = stats.observedRTP;

    // Trigger analysis based on mode
    if (this.config.mobileOptimized) {
      if (session.spins.length % this.config.mobileBatchSize === 0) {
        void this.analyzeSession(sessionKey);
      }
    } else {
      if (session.spins.length >= this.config.minSpinsRequired) {
        void this.analyzeSession(sessionKey);
      }
    }
  }

  /**
   * Record multiple spins at once (mobile batch upload)
   */
  recordSpinBatch(spins: SpinResult[]): void {
    for (const spin of spins) {
      this.recordSpin(spin);
    }
  }

  /**
   * Analyze a specific session
   */
  async analyzeSession(sessionKey: string): Promise<AnalysisReport | null> {
    const session = this.sessions.get(sessionKey);
    if (!session || session.spins.length < this.config.minSpinsRequired) {
      return null;
    }

    const window = this.getAnalysisWindow(session.spins);
    const stats = this.calculateRTPStats(window);

    // Run all anomaly detection algorithms
    const pumpAnalysis = this.detectPump(stats);
    const clusterAnalysis = this.detectWinClustering(window);
    const driftAnalysis = this.detectRTPDrift(session.spins);

    // Calculate overall risk score
    const overallRiskScore = this.calculateRiskScore(
      pumpAnalysis,
      clusterAnalysis,
      driftAnalysis
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      pumpAnalysis,
      clusterAnalysis,
      driftAnalysis,
      overallRiskScore
    );

    const report: AnalysisReport = {
      userId: session.userId,
      casinoId: session.casinoId,
      analyzedAt: Date.now(),
      window: stats,
      pumpAnalysis,
      clusterAnalysis,
      driftAnalysis,
      overallRiskScore,
      recommendations,
    };

    // Store in history
    this.storeReport(session.userId, report);

    // Publish events if anomalies detected
    if (this.config.autoPublish) {
      await this.publishAnomalyEvents(session, report);
    }

    return report;
  }

  /**
   * Get mobile-optimized summary for a session
   */
  getMobileSummary(sessionKey: string): MobileAnomalySummary | null {
    const session = this.sessions.get(sessionKey);
    if (!session) return null;

    const stats = this.calculateRTPStats(session.spins);
    const pump = this.detectPump(stats);
    const cluster = this.detectWinClustering(session.spins);
    const drift = this.detectRTPDrift(session.spins);

    // Compute anomaly flags
    let af = 0;
    if (pump.detected) af |= 1;
    if (cluster.detected) af |= 2;
    if (drift.detected) af |= 4;

    // Compute max severity
    const severities = [pump, cluster, drift];
    let maxSev = 0;
    for (const a of severities) {
      if (a.severity === 'critical') maxSev = 2;
      else if (a.severity === 'warning' && maxSev < 1) maxSev = 1;
    }

    // Compute max confidence
    const maxConf = Math.max(pump.confidence, cluster.confidence, drift.confidence);

    return {
      sid: session.sessionId,
      ts: Date.now(),
      af,
      cf: Math.round(maxConf * 100),
      rtp: Math.round(stats.observedRTP * 1000) / 10, // e.g., 96.5
      sc: stats.spinCount,
      sv: maxSev,
    };
  }

  /**
   * Set baseline RTP for a specific game
   */
  setGameBaseline(gameId: string, baselineRTP: number): void {
    this.baselinesByGame.set(gameId, baselineRTP);
  }

  /**
   * Get analysis history for a user
   */
  getHistory(userId: string): AnalysisReport[] {
    return this.analysisHistory.get(userId) || [];
  }

  /**
   * End a session and return final analysis
   */
  async endSession(sessionKey: string): Promise<AnalysisReport | null> {
    const report = await this.analyzeSession(sessionKey);
    const session = this.sessions.get(sessionKey);
    
    if (session) {
      session.isActive = false;
    }
    
    return report;
  }

  /**
   * Clear a session
   */
  clearSession(sessionKey: string): void {
    this.sessions.delete(sessionKey);
  }

  // ============================================
  // ANOMALY DETECTION ALGORITHMS
  // ============================================

  /**
   * Detect RTP pump (artificially inflated returns)
   * 
   * This detects when a casino shows higher than normal RTP
   * to hook new players or encourage larger bets.
   */
  private detectPump(stats: RTPStats): AnomalyResult {
    const baseline = this.config.baselineRTP;
    const deviation = stats.observedRTP - baseline;
    const deviationRatio = deviation / baseline;

    // No pump if RTP is at or below baseline
    if (deviation <= 0) {
      return {
        anomalyType: 'pump',
        detected: false,
        severity: 'none',
        confidence: 0,
        reason: 'RTP within normal range',
        metadata: {
          observedRTP: stats.observedRTP,
          baselineRTP: baseline,
          deviationRatio,
        },
      };
    }

    // Calculate confidence based on sample size and deviation magnitude
    const sampleConfidence = Math.min(1, stats.spinCount / this.config.windowSize);
    const deviationConfidence = Math.min(1, Math.abs(deviationRatio) / this.config.pumpThreshold);
    const confidence = sampleConfidence * deviationConfidence;

    // Determine severity
    let severity: 'none' | 'warning' | 'critical' = 'none';
    if (deviationRatio >= this.config.pumpThreshold * 2) {
      severity = 'critical';
    } else if (deviationRatio >= this.config.pumpThreshold) {
      severity = 'warning';
    }

    const detected = severity !== 'none';
    const percentDeviation = (deviationRatio * 100).toFixed(1);

    return {
      anomalyType: 'pump',
      detected,
      severity,
      confidence,
      reason: detected
        ? `RTP elevated ${percentDeviation}% above baseline in ${stats.spinCount}-spin window`
        : 'RTP within acceptable range',
      metadata: {
        observedRTP: stats.observedRTP,
        baselineRTP: baseline,
        deviationRatio,
        windowSize: stats.spinCount,
      },
    };
  }

  /**
   * Detect suspicious win clustering
   * 
   * Natural wins should be relatively randomly distributed.
   * Suspicious clustering could indicate manipulation.
   */
  private detectWinClustering(spins: SpinResult[]): AnomalyResult {
    if (spins.length < this.config.minSpinsRequired) {
      return {
        anomalyType: 'win_clustering',
        detected: false,
        severity: 'none',
        confidence: 0,
        reason: 'Insufficient data for clustering analysis',
        metadata: { spinCount: spins.length },
      };
    }

    const clusterStats = this.calculateClusterStats(spins);
    
    // Calculate confidence based on sample size
    const sampleConfidence = Math.min(1, spins.length / this.config.windowSize);
    const clusterConfidence = clusterStats.clusterScore;
    const confidence = sampleConfidence * clusterConfidence;

    // Determine severity based on cluster score and z-score
    let severity: 'none' | 'warning' | 'critical' = 'none';
    if (clusterStats.clusterScore >= this.config.clusterThreshold * 1.2 || 
        Math.abs(clusterStats.zScore) > 3) {
      severity = 'critical';
    } else if (clusterStats.clusterScore >= this.config.clusterThreshold || 
               Math.abs(clusterStats.zScore) > 2) {
      severity = 'warning';
    }

    const detected = severity !== 'none';

    return {
      anomalyType: 'win_clustering',
      detected,
      severity,
      confidence,
      reason: detected
        ? `Abnormal win clustering detected (score: ${clusterStats.clusterScore.toFixed(2)}, z-score: ${clusterStats.zScore.toFixed(2)})`
        : 'Win distribution appears normal',
      metadata: {
        clusterScore: clusterStats.clusterScore,
        winStreakCount: clusterStats.winStreakCount,
        maxStreak: clusterStats.maxStreak,
        avgStreakLength: clusterStats.avgStreakLength,
        zScore: clusterStats.zScore,
        windowSize: spins.length,
      },
    };
  }

  /**
   * Detect RTP drift (gradual deviation from baseline)
   * 
   * Monitors for consistent deviation that might indicate
   * the game's actual RTP doesn't match advertised.
   */
  private detectRTPDrift(spins: SpinResult[]): AnomalyResult {
    if (spins.length < this.config.minSpinsRequired * 2) {
      return {
        anomalyType: 'rtp_drift',
        detected: false,
        severity: 'none',
        confidence: 0,
        reason: 'Insufficient data for drift analysis',
        metadata: { spinCount: spins.length },
      };
    }

    // Calculate RTP in multiple windows and look for consistent drift
    const windowSize = Math.min(50, Math.floor(spins.length / 3));
    const windows: number[] = [];

    for (let i = 0; i + windowSize <= spins.length; i += Math.floor(windowSize / 2)) {
      const windowSpins = spins.slice(i, i + windowSize);
      const stats = this.calculateRTPStats(windowSpins);
      windows.push(stats.observedRTP);
    }

    // Calculate drift trend (simple linear regression slope)
    const { slope, correlation } = this.calculateTrend(windows);
    const overallStats = this.calculateRTPStats(spins);
    const deviation = overallStats.observedRTP - this.config.baselineRTP;
    const deviationRatio = Math.abs(deviation / this.config.baselineRTP);

    // Confidence based on consistency of drift
    const trendConfidence = Math.abs(correlation);
    const sampleConfidence = Math.min(1, spins.length / (this.config.windowSize * 2));
    const confidence = trendConfidence * sampleConfidence;

    // Determine severity
    let severity: 'none' | 'warning' | 'critical' = 'none';
    if (deviationRatio >= this.config.driftThreshold * 2 && trendConfidence > 0.6) {
      severity = 'critical';
    } else if (deviationRatio >= this.config.driftThreshold && trendConfidence > 0.4) {
      severity = 'warning';
    }

    const detected = severity !== 'none';
    const direction = slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'stable';

    return {
      anomalyType: 'rtp_drift',
      detected,
      severity,
      confidence,
      reason: detected
        ? `RTP showing ${direction} drift of ${(deviationRatio * 100).toFixed(1)}% from baseline`
        : 'RTP stable within expected range',
      metadata: {
        observedRTP: overallStats.observedRTP,
        baselineRTP: this.config.baselineRTP,
        deviationRatio,
        slope,
        correlation,
        windowsAnalyzed: windows.length,
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private createSession(userId: string, casinoId: string): GameplaySession {
    return {
      sessionId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId,
      casinoId,
      startedAt: Date.now(),
      lastActivity: Date.now(),
      spins: [],
      sessionRTP: 0,
      isActive: true,
    };
  }

  private getAnalysisWindow(spins: SpinResult[]): SpinResult[] {
    const windowSize = this.config.windowSize;
    if (spins.length <= windowSize) {
      return spins;
    }
    return spins.slice(-windowSize);
  }

  private calculateRTPStats(spins: SpinResult[]): RTPStats {
    if (spins.length === 0) {
      return {
        observedRTP: 0,
        totalWagers: 0,
        totalPayouts: 0,
        spinCount: 0,
        windowStart: 0,
        windowEnd: 0,
      };
    }

    let totalWagers = 0;
    let totalPayouts = 0;

    for (const spin of spins) {
      totalWagers += spin.wager;
      totalPayouts += spin.payout;
    }

    return {
      observedRTP: totalWagers > 0 ? totalPayouts / totalWagers : 0,
      totalWagers,
      totalPayouts,
      spinCount: spins.length,
      windowStart: spins[0].timestamp,
      windowEnd: spins[spins.length - 1].timestamp,
    };
  }

  private calculateClusterStats(spins: SpinResult[]): ClusterStats {
    // Identify wins (payout > 0 for simplicity)
    const wins = spins.map(s => s.payout > 0 ? 1 : 0);
    const winRate = wins.reduce<number>((a, b) => a + b, 0) / wins.length;

    // Count streaks
    const streaks: number[] = [];
    let currentStreak = 0;

    for (const win of wins) {
      if (win === 1) {
        currentStreak++;
      } else if (currentStreak > 0) {
        streaks.push(currentStreak);
        currentStreak = 0;
      }
    }
    if (currentStreak > 0) {
      streaks.push(currentStreak);
    }

    const maxStreak = streaks.length > 0 ? Math.max(...streaks) : 0;
    const avgStreakLength = streaks.length > 0 
      ? streaks.reduce((a, b) => a + b, 0) / streaks.length 
      : 0;

    // Expected streak length in random sequence
    // For a Bernoulli process, expected max streak length is approximately log(n) / -log(p)
    const expectedMaxStreak = winRate > 0 && winRate < 1
      ? Math.log(wins.length) / -Math.log(winRate)
      : 1;

    // Calculate z-score for max streak
    // Standard deviation for max streak is approximately 1/sqrt(n)
    const stdDev = 1 / Math.sqrt(wins.length);
    const zScore = expectedMaxStreak > 0 
      ? (maxStreak - expectedMaxStreak) / (expectedMaxStreak * stdDev)
      : 0;

    // Cluster score: higher means more clustered
    // Based on how much max streak exceeds expected
    const clusterScore = maxStreak > expectedMaxStreak
      ? Math.min(1, (maxStreak - expectedMaxStreak) / expectedMaxStreak)
      : 0;

    return {
      clusterScore,
      winStreakCount: streaks.length,
      maxStreak,
      avgStreakLength,
      zScore,
    };
  }

  private calculateTrend(values: number[]): { slope: number; correlation: number } {
    if (values.length < 2) {
      return { slope: 0, correlation: 0 };
    }

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = i - xMean;
      const yDiff = values[i] - yMean;
      numerator += xDiff * yDiff;
      denomX += xDiff * xDiff;
      denomY += yDiff * yDiff;
    }

    const slope = denomX > 0 ? numerator / denomX : 0;
    const correlation = (denomX > 0 && denomY > 0) 
      ? numerator / (Math.sqrt(denomX) * Math.sqrt(denomY))
      : 0;

    return { slope, correlation };
  }

  private calculateRiskScore(
    pump: AnomalyResult,
    cluster: AnomalyResult,
    drift: AnomalyResult
  ): number {
    // Weight each anomaly type
    const weights = {
      pump: 0.4,
      cluster: 0.3,
      drift: 0.3,
    };

    // Severity to score mapping
    const severityScore = (severity: 'none' | 'warning' | 'critical'): number => {
      switch (severity) {
        case 'critical': return 100;
        case 'warning': return 50;
        default: return 0;
      }
    };

    const pumpScore = severityScore(pump.severity) * pump.confidence;
    const clusterScore = severityScore(cluster.severity) * cluster.confidence;
    const driftScore = severityScore(drift.severity) * drift.confidence;

    return Math.round(
      pumpScore * weights.pump +
      clusterScore * weights.cluster +
      driftScore * weights.drift
    );
  }

  private generateRecommendations(
    pump: AnomalyResult,
    cluster: AnomalyResult,
    drift: AnomalyResult,
    riskScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (pump.severity === 'critical') {
      recommendations.push('⚠️ High RTP detected - may be intentional pump to encourage larger bets. Consider reducing bet sizes.');
    } else if (pump.severity === 'warning') {
      recommendations.push('💡 RTP above normal - enjoy the wins but stay cautious.');
    }

    if (cluster.severity === 'critical') {
      recommendations.push('🎯 Unusual win clustering detected - patterns may not continue. Set a stop-win limit.');
    } else if (cluster.severity === 'warning') {
      recommendations.push('📊 Some win clustering observed - maintain bankroll discipline.');
    }

    if (drift.severity === 'critical') {
      recommendations.push('📉 Significant RTP drift from advertised - consider reporting to regulators.');
    } else if (drift.severity === 'warning') {
      recommendations.push('📈 RTP trending differently than expected - monitor closely.');
    }

    if (riskScore >= 70) {
      recommendations.push('🛑 Overall risk is HIGH - strongly consider taking a break.');
    } else if (riskScore >= 40) {
      recommendations.push('⚡ Moderate anomalies detected - exercise extra caution.');
    } else if (recommendations.length === 0) {
      recommendations.push('✅ No significant anomalies detected - gameplay appears fair.');
    }

    return recommendations;
  }

  private storeReport(userId: string, report: AnalysisReport): void {
    if (!this.analysisHistory.has(userId)) {
      this.analysisHistory.set(userId, []);
    }
    const history = this.analysisHistory.get(userId)!;
    history.push(report);

    // Keep last 50 reports per user
    if (history.length > 50) {
      history.shift();
    }
  }

  private async publishAnomalyEvents(
    session: GameplaySession,
    report: AnalysisReport
  ): Promise<void> {
    const publishEvent = async (analysis: AnomalyResult, eventType: string) => {
      if (!analysis.detected) return;

      const event: GameplayAnomalyEvent = {
        userId: session.userId,
        casinoId: session.casinoId,
        anomalyType: analysis.anomalyType,
        severity: analysis.severity as 'warning' | 'critical',
        confidence: analysis.confidence,
        metadata: analysis.metadata as Record<string, any>,
        reason: analysis.reason,
        timestamp: Date.now(),
      };

      await eventRouter.publish(
        eventType as any,
        'tiltcheck-core', // Using existing ModuleId
        event,
        session.userId
      );
    };

    // Publish specific events based on anomaly type
    if (report.pumpAnalysis.detected) {
      await publishEvent(report.pumpAnalysis, 'fairness.pump.detected');
    }
    if (report.clusterAnalysis.detected) {
      await publishEvent(report.clusterAnalysis, 'fairness.cluster.detected');
    }
    // Note: drift events could be added to the event types if needed
  }

  // ============================================
  // MOBILE DEVICE UTILITIES
  // ============================================

  /**
   * Parse compressed spin data from mobile devices
   * Format: "wager|payout|timestamp;wager|payout|timestamp;..."
   */
  parseCompressedSpins(
    compressedData: string,
    userId: string,
    casinoId: string,
    gameId: string
  ): SpinResult[] {
    if (!compressedData) return [];

    return compressedData.split(';').map((entry, index) => {
      const [wager, payout, timestamp] = entry.split('|').map(Number);
      return {
        spinId: `${userId}-${timestamp}-${index}`,
        userId,
        casinoId,
        gameId,
        wager: wager || 0,
        payout: payout || 0,
        timestamp: timestamp || Date.now(),
      };
    });
  }

  /**
   * Get battery-efficient polling interval recommendation
   */
  getMobilePollInterval(batteryLevel?: number, isCharging?: boolean): number {
    // Base interval: 30 seconds
    let interval = 30000;

    // Increase interval on low battery
    if (batteryLevel !== undefined) {
      if (batteryLevel < 20 && !isCharging) {
        interval = 120000; // 2 minutes
      } else if (batteryLevel < 50 && !isCharging) {
        interval = 60000; // 1 minute
      }
    }

    return interval;
  }

  /**
   * Get minimal payload for mobile transmission
   */
  getMinimalPayload(sessionKey: string): { ok: boolean; data?: MobileAnomalySummary } {
    const summary = this.getMobileSummary(sessionKey);
    if (!summary) {
      return { ok: false };
    }
    return { ok: true, data: summary };
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GameplayAnalyzerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): GameplayAnalyzerConfig {
    return { ...this.config };
  }

  /**
   * Enable mobile optimized mode
   */
  enableMobileMode(): void {
    this.config.mobileOptimized = true;
  }

  /**
   * Disable mobile optimized mode
   */
  disableMobileMode(): void {
    this.config.mobileOptimized = false;
  }

  // ============================================
  // TEST UTILITIES
  // ============================================

  /**
   * Clear all sessions and history (for testing)
   */
  clearAll(): void {
    this.sessions.clear();
    this.analysisHistory.clear();
    this.baselinesByGame.clear();
  }

  /**
   * Get session count (for testing)
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get a session (for testing)
   */
  getSession(sessionKey: string): GameplaySession | undefined {
    return this.sessions.get(sessionKey);
  }
}

// Export singleton instance
export const gameplayAnalyzer = new GameplayAnalyzerService();
