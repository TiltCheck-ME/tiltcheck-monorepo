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
