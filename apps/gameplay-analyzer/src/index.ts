// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * GameplayAnalyzer Service
 * @module @tiltcheck/gameplay-analyzer
 */

// Core Gameplay Analyzer
export { GameplayAnalyzerService, gameplayAnalyzer } from './gameplay-analyzer.js';
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

// PWA Client
export { GameplayPWAClient, QuickBetTracker } from './pwa/index.js';
export type { PWAClientConfig } from './pwa/index.js';

// Provably Fair Verification
export { ProvablyFairVerifier, provablyFairVerifier } from './provably-fair/index.js';
export type {
  ProvablyFairGameType,
  RiskLevel,
  ProvablyFairBet,
  BetVerificationResult,
  BatchVerificationResult,
  VerificationAnomaly,
  ArchiveFormat,
  ArchiveUploadConfig,
  ParsedArchive,
} from './provably-fair/index.js';

// Sidebar Companion Types
export type {
  SidebarMode,
  SidebarPanel,
  SidebarState,
  SidebarPreferences,
  SessionStats,
  SidebarNotification,
  VaultStatus,
  ChatState,
  ChatMessage,
  AccountabilityState,
  AccountabilityBuddy,
  CooldownState,
  SidebarEvent,
} from './sidebar/index.js';

// Gameplay Compliance
export { evaluateGameplayCompliance } from './gameplay-compliance.js';
export type {
  ComplianceSeverity,
  ComplianceFlagCode,
  GameplayComplianceContext,
  RegulationSnapshot,
  ComplianceFlag,
  GameplayComplianceResult,
} from './gameplay-compliance.js';

