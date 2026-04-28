// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-25
// v0.1.0 — 2026-02-25

/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/shared
 *
 * Shared SDK for TiltCheck API
 * Provides type-safe API client with authentication support
 */

// Client exports
export {
  TiltCheckClient,
  TiltCheckAPIError,
  createClient,
  type ClientConfig,
  type RequestOptions,
} from './client.js';

// Schema exports
export {
  registerSchema,
  loginSchema,
  authResponseSchema,
  userSchema,
  errorSchema,
  type RegisterRequest,
  type LoginRequest,
  type AuthResponse,
  type User,
  type ErrorResponse,
} from './schemas.js';

// Legal exports
export * from './legal.js';

// Fairness exports
export { FairnessService } from './fairness.js';
export {
  SeedHealthAuditor,
  seedHealthAuditor,
  auditSeedHealth,
} from './seed-audit.js';
export {
  compareTarotFlipMechanics,
  parseTarotFlipMechanicsSnapshot,
  type TarotFlipCardRules,
  type TarotFlipComparisonResult,
  type TarotFlipDifficultyComparison,
  type TarotFlipDifficultyProfile,
  type TarotFlipDifficultyStep,
  type TarotFlipDifference,
  type TarotFlipMechanicsSnapshot,
} from './tarot-flip-comparison.js';

// Trivia exports
export * from './trivia.js';

// Community casino defaults
export {
  COMMUNITY_DEFAULT_CASINOS,
  COMMUNITY_DEFAULT_MONITORED_CASINOS,
  getCommunityDefaultCasinoPriority,
  isCommunityDefaultCasino,
  normalizeCasinoName,
  type CommunityDefaultCasino,
} from './community-casinos.js';
