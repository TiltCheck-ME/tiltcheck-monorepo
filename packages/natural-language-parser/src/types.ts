/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Natural Language Parser - Types
 * Parses human-friendly inputs for amounts, durations, and targets
 */

export interface ParsedAmount {
  value: number;
  currency: 'SOL' | 'USD';
  isAll: boolean; // "all" or "everything"
  originalInput: string;
  confidence: number; // 0-1 confidence in parse accuracy
}

export interface ParsedDuration {
  milliseconds: number;
  originalInput: string;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
  confidence: number;
}

export interface ParsedTarget {
  type: 'user' | 'role' | 'random' | 'active' | 'poor';
  userIds?: string[];
  roleId?: string;
  count?: number; // for "3 random users"
  criteria?: string; // "active last 24h", "lowest balance", etc.
  originalInput: string;
  confidence: number;
}

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  suggestions?: string[];
  needsConfirmation?: boolean;
  confirmationPrompt?: string;
}
