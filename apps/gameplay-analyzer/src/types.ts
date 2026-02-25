// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * GameplayAnalyzer Types
 * Core type definitions for gameplay anomaly detection
 */

/**
 * A single spin result from gameplay data
 */
export interface SpinResult {
  /** Unique spin identifier */
  spinId: string;
  /** User/player identifier */
  userId: string;
  /** Casino identifier */
  casinoId: string;
  /** Game identifier (e.g., slot name) */
  gameId: string;
  /** Wager amount */
  wager: number;
  /** Payout amount */
  payout: number;
  /** Timestamp of the spin */
  timestamp: number;
  /** Optional: Whether this was a bonus/free spin */
  isBonus?: boolean;
  /** Optional: Session identifier for grouping */
  sessionId?: string;
}

/**
 * RTP (Return to Player) statistics for a window
 */
export interface RTPStats {
  /** Observed RTP in this window (payout/wager ratio) */
  observedRTP: number;
  /** Total wagers in this window */
  totalWagers: number;
  /** Total payouts in this window */
  totalPayouts: number;
  /** Number of spins in window */
  spinCount: number;
  /** Start timestamp of window */
  windowStart: number;
  /** End timestamp of window */
  windowEnd: number;
}

/**
 * Win clustering statistics
 */
export interface ClusterStats {
  /** Cluster score (0-1, higher = more clustered) */
  clusterScore: number;
  /** Number of win streaks detected */
  winStreakCount: number;
  /** Maximum consecutive wins */
  maxStreak: number;
  /** Average streak length */
  avgStreakLength: number;
  /** Z-score for clustering deviation */
  zScore: number;
}

/**
 * Anomaly detection result
 */
export interface AnomalyResult {
  /** Type of anomaly detected */
  anomalyType: 'pump' | 'win_clustering' | 'rtp_drift';
  /** Whether an anomaly was detected */
  detected: boolean;
  /** Severity of the anomaly */
  severity: 'none' | 'warning' | 'critical';
  /** Confidence score (0-1) */
  confidence: number;
  /** Human-readable reason */
  reason: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Configuration for the GameplayAnalyzer
 */
export interface GameplayAnalyzerConfig {
  /** Baseline RTP for comparison (default: 0.96 or 96%) */
  baselineRTP: number;
  /** Window size in number of spins for analysis */
  windowSize: number;
  /** RTP deviation threshold for pump detection (default: 0.10 or 10%) */
  pumpThreshold: number;
  /** RTP deviation threshold for drift detection (default: 0.05 or 5%) */
  driftThreshold: number;
  /** Cluster score threshold (default: 0.75) */
  clusterThreshold: number;
  /** Minimum spins required for analysis */
  minSpinsRequired: number;
  /** Auto-publish events to event router */
  autoPublish: boolean;
  /** Enable mobile-optimized mode (smaller payloads, less frequent updates) */
  mobileOptimized: boolean;
  /** Mobile batch size (aggregate multiple spins before analysis) */
  mobileBatchSize: number;
}

/**
 * User gameplay session (for mobile tracking)
 */
export interface GameplaySession {
  /** Session identifier */
  sessionId: string;
  /** User identifier */
  userId: string;
  /** Casino identifier */
  casinoId: string;
  /** Session start timestamp */
  startedAt: number;
  /** Last activity timestamp */
  lastActivity: number;
  /** Accumulated spins in this session */
  spins: SpinResult[];
  /** Current session RTP */
  sessionRTP: number;
  /** Whether session is active */
  isActive: boolean;
}

/**
 * Mobile-optimized anomaly summary
 * Designed for efficient transmission over mobile networks
 */
export interface MobileAnomalySummary {
  /** Session ID */
  sid: string;
  /** Timestamp */
  ts: number;
  /** Anomaly detected (bit flags: 1=pump, 2=cluster, 4=drift) */
  af: number;
  /** Confidence (0-100 compressed) */
  cf: number;
  /** Current RTP (percent, e.g., 96.5) */
  rtp: number;
  /** Spin count */
  sc: number;
  /** Severity (0=none, 1=warning, 2=critical) */
  sv: number;
}

/**
 * Analysis request for mobile devices
 */
export interface MobileAnalysisRequest {
  /** Session ID */
  sessionId: string;
  /** Compressed spin data (wager|payout|timestamp tuples) */
  spins: string;
  /** Device type for optimization hints */
  deviceType?: 'phone' | 'tablet' | 'watch';
  /** Whether on limited data connection */
  limitedData?: boolean;
}

/**
 * Full analysis report
 */
export interface AnalysisReport {
  /** User identifier */
  userId: string;
  /** Casino identifier */
  casinoId: string;
  /** Analysis timestamp */
  analyzedAt: number;
  /** Window of spins analyzed */
  window: RTPStats;
  /** Pump detection result */
  pumpAnalysis: AnomalyResult;
  /** Win clustering result */
  clusterAnalysis: AnomalyResult;
  /** RTP drift result */
  driftAnalysis: AnomalyResult;
  /** Overall risk score (0-100) */
  overallRiskScore: number;
  /** Recommendations for the user */
  recommendations: string[];
}
