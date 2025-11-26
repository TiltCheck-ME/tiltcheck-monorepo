/**
 * GameplayAnalyzer Service
 * @module @tiltcheck/gameplay-analyzer
 */

export { GameplayAnalyzerService, gameplayAnalyzer } from './gameplay-analyzer.js';
export { GameplayPWAClient, QuickBetTracker } from './pwa/index.js';
export type {
  SpinResult,
  RTPStats,
  ClusterStats,
  AnomalyResult,
  GameplayAnalyzerConfig,
  GameplaySession,
  MobileAnomalySummary,
  MobileAnalysisRequest,
  AnalysisReport,
} from './types.js';
export type { PWAClientConfig } from './pwa/index.js';
