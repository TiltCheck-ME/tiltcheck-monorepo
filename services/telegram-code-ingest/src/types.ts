/**
 * Types for Telegram Code Ingest Service
 */

/**
 * Detected promo code from Telegram
 */
export interface PromoCode {
  id: string;
  code: string;
  sourceChannel: string;
  detectedAt: Date;
  expiresAt?: Date;
  metadata?: {
    messageId?: string;
    messageText?: string;
    wagersRequired?: number;
    eligibilityRules?: string[];
  };
  status: 'active' | 'expired' | 'invalid';
}

/**
 * Configuration for Telegram monitoring
 */
export interface TelegramConfig {
  apiId: string;
  apiHash: string;
  sessionString?: string;
  channels: string[];
  pollInterval: number; // in seconds
}

/**
 * Database interface for code storage
 */
export interface CodeDatabase {
  saveCode(code: PromoCode): Promise<void>;
  getCode(code: string): Promise<PromoCode | null>;
  getActiveCodes(): Promise<PromoCode[]>;
  updateCodeStatus(code: string, status: PromoCode['status']): Promise<void>;
}
