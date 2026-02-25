// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Provably Fair Verification Types
 *
 * Types for verifying casino game outcomes using cryptographic seeds
 */

/**
 * Supported provably fair game types
 */
export type ProvablyFairGameType = 
  | 'plinko'
  | 'keno'
  | 'mines'
  | 'dice'
  | 'limbo'
  | 'crash'
  | 'pump'
  | 'wheel'
  | 'hilo';

/**
 * Risk level for games like Plinko
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * A single provably fair bet record
 */
export interface ProvablyFairBet {
  /** Unique bet identifier */
  betId: string;
  /** Game type */
  game: ProvablyFairGameType;
  /** Server seed (revealed after bet) */
  serverSeed: string;
  /** Server seed hash (shown before bet) */
  serverSeedHash: string;
  /** Client seed chosen by user */
  clientSeed: string;
  /** Nonce/bet number in sequence */
  nonce: number;
  /** Wager amount */
  wager: number;
  /** Claimed payout from casino */
  claimedPayout: number;
  /** Claimed multiplier from casino */
  claimedMultiplier: number;
  /** Timestamp of bet */
  timestamp: number;
  
  // Game-specific parameters
  /** Plinko: number of rows (8, 12, 16) */
  rows?: number;
  /** Plinko/Keno: risk level */
  risk?: RiskLevel;
  /** Keno: numbers selected */
  kenoSelections?: number[];
  /** Mines: number of mines */
  mineCount?: number;
  /** Dice/Limbo: target value */
  target?: number;
  /** Dice: roll over or under */
  rollOver?: boolean;
}

/**
 * Result of verifying a single bet
 */
export interface BetVerificationResult {
  /** The original bet */
  bet: ProvablyFairBet;
  /** Whether the server seed hash matches */
  seedHashValid: boolean;
  /** Calculated outcome from seeds */
  calculatedOutcome: CalculatedOutcome;
  /** Whether claimed result matches calculated */
  resultValid: boolean;
  /** Whether payout matches expected for outcome */
  payoutValid: boolean;
  /** Discrepancy amount if payout doesn't match */
  payoutDiscrepancy?: number;
  /** Human-readable verification message */
  message: string;
}

/**
 * Calculated outcome from seed verification
 */
export interface CalculatedOutcome {
  /** Raw hash result */
  hash: string;
  /** Game-specific result */
  result: unknown;
  /** Expected multiplier for this outcome */
  expectedMultiplier: number;
  /** Expected payout (wager * multiplier) */
  expectedPayout: number;
}

/**
 * Plinko-specific calculated outcome
 */
export interface PlinkoOutcome extends CalculatedOutcome {
  result: {
    /** Path taken (0 = left, 1 = right) */
    path: number[];
    /** Final bucket position */
    bucket: number;
  };
}

/**
 * Keno-specific calculated outcome
 */
export interface KenoOutcome extends CalculatedOutcome {
  result: {
    /** Numbers drawn */
    drawnNumbers: number[];
    /** Numbers that matched user selection */
    hits: number[];
    /** Hit count */
    hitCount: number;
  };
}

/**
 * Mines-specific calculated outcome
 */
export interface MinesOutcome extends CalculatedOutcome {
  result: {
    /** Mine positions (0-24 for 5x5 grid) */
    minePositions: number[];
  };
}

/**
 * Dice/Limbo calculated outcome
 */
export interface DiceOutcome extends CalculatedOutcome {
  result: {
    /** Roll result (0-99.99 or multiplier for Limbo) */
    roll: number;
    /** Whether bet won */
    won: boolean;
  };
}

/**
 * Batch verification result for multiple bets
 */
export interface BatchVerificationResult {
  /** Total bets analyzed */
  totalBets: number;
  /** Bets with valid seeds */
  validSeeds: number;
  /** Bets with matching results */
  validResults: number;
  /** Bets with correct payouts */
  validPayouts: number;
  /** Total wagered amount */
  totalWagered: number;
  /** Total claimed payout */
  totalClaimedPayout: number;
  /** Total expected payout (from verification) */
  totalExpectedPayout: number;
  /** Discrepancy (claimed - expected) */
  payoutDiscrepancy: number;
  /** Observed RTP from claims */
  claimedRTP: number;
  /** Expected RTP from verification */
  expectedRTP: number;
  /** Individual bet results */
  betResults: BetVerificationResult[];
  /** Summary message */
  summary: string;
  /** Anomalies detected */
  anomalies: VerificationAnomaly[];
}

/**
 * Anomaly detected during verification
 */
export interface VerificationAnomaly {
  type: 'seed_mismatch' | 'result_mismatch' | 'payout_mismatch' | 'rtp_deviation';
  severity: 'warning' | 'critical';
  betId?: string;
  message: string;
  details: Record<string, unknown>;
}

/**
 * Supported archive file formats
 */
export type ArchiveFormat = 'csv' | 'json' | 'stake_csv' | 'bc_game_csv' | 'roobet_csv';

/**
 * Archive upload configuration
 */
export interface ArchiveUploadConfig {
  /** File format */
  format: ArchiveFormat;
  /** Casino identifier */
  casinoId: string;
  /** Custom column mappings (for CSV) */
  columnMappings?: Record<string, string>;
}

/**
 * Parsed archive data
 */
export interface ParsedArchive {
  /** Successfully parsed bets */
  bets: ProvablyFairBet[];
  /** Rows that failed to parse */
  errors: ArchiveParseError[];
  /** Archive metadata */
  metadata: {
    format: ArchiveFormat;
    totalRows: number;
    successfulRows: number;
    dateRange?: { start: number; end: number };
  };
}

/**
 * Error during archive parsing
 */
export interface ArchiveParseError {
  row: number;
  rawData: string;
  error: string;
}

/**
 * Payout tables for different games
 */
export interface PayoutTable {
  game: ProvablyFairGameType;
  variant?: string;
  risk?: RiskLevel;
  rows?: number;
  /** Mapping of outcome to multiplier */
  payouts: Record<string | number, number>;
}
