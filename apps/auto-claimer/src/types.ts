/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Frontend types for Auto-Claimer
 */

export interface ClaimStatus {
  userId: string;
  total: number;
  claimed: number;
  skipped: number;
  failed: number;
  processing: number;
}

export interface ClaimHistoryItem {
  id: string;
  code: string;
  status: 'claimed' | 'skipped' | 'failed';
  reason?: string;
  reward?: {
    type: string;
    amount: number;
    currency?: string;
  };
  attemptedAt: string;
}

export interface ClaimHistory {
  userId: string;
  claims: ClaimHistoryItem[];
}

export interface AvailableCode {
  code: string;
  source: string;
  detectedAt: string;
  wagersRequired?: number;
}

export interface SubmitApiKeyResponse {
  userId: string;
  message: string;
}
