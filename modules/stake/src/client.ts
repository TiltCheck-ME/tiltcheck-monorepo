/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Stake API Client
 * 
 * Provides methods to interact with Stake.com API for checking eligibility
 * and claiming promo codes.
 * 
 * NOTE: This is a placeholder implementation. The actual Stake API endpoints
 * and authentication methods should be used in production.
 */

import type {
  StakeClientConfig,
  EligibilityResult,
  ClaimResult,
  WagerRequirement,
  StakeApiErrorResponse,
} from './types.js';
import {
  StakeApiError,
  RateLimitError,
  AuthenticationError,
} from './errors.js';

/**
 * Stake API client
 */
export class StakeClient {
  private config: Required<StakeClientConfig>;

  constructor(config: StakeClientConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.stake.com',
      timeout: config.timeout || 10000,
    };
  }

  /**
   * Check if user is eligible to claim a code
   */
  async checkEligibility(code: string): Promise<EligibilityResult> {
    try {
      // Placeholder implementation
      // In production, make actual API call:
      // const response = await this.request('POST', '/promo/check-eligibility', { code });

      // Mock implementation for development
      if (process.env.STAKE_MOCK_API === 'true') {
        return this.mockEligibilityCheck(code);
      }

      const response = await this.request<{
        eligible: boolean;
        reason?: string;
        wagersRequired?: number;
        expiresAt?: string;
      }>('POST', '/promo/check-eligibility', { code });

      return {
        eligible: response.eligible,
        reason: response.reason,
        wagersRequired: response.wagersRequired,
        expiresAt: response.expiresAt ? new Date(response.expiresAt) : undefined,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Claim a promo code
   */
  async claimCode(code: string): Promise<ClaimResult> {
    try {
      // Placeholder implementation
      // In production, make actual API call:
      // const response = await this.request('POST', '/promo/claim', { code });

      // Mock implementation for development
      if (process.env.STAKE_MOCK_API === 'true') {
        return this.mockClaimCode(code);
      }

      const response = await this.request<{
        success: boolean;
        reward?: {
          type: string;
          amount: number;
          currency?: string;
        };
        error?: string;
      }>('POST', '/promo/claim', { code });

      return {
        success: response.success,
        reward: response.reward as ClaimResult['reward'],
        error: response.error,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get wager requirement for a code
   */
  async getWagerRequirement(code: string): Promise<WagerRequirement> {
    try {
      // Placeholder implementation
      if (process.env.STAKE_MOCK_API === 'true') {
        return {
          amount: 100,
          currency: 'USD',
          met: false,
          remaining: 100,
        };
      }

      const response = await this.request<WagerRequirement>(
        'GET',
        `/promo/${code}/wager`
      );

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make HTTP request to Stake API
   * 
   * @private
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get('Retry-After') || '60',
          10
        );
        throw new RateLimitError('Rate limit exceeded', retryAfter);
      }

      // Handle authentication errors
      if (response.status === 401) {
        throw new AuthenticationError();
      }

      // Parse response
      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        const errorData = data as StakeApiErrorResponse;
        throw new StakeApiError(
          errorData.message || errorData.error || 'API request failed',
          response.status,
          errorData.code
        );
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if ((error as Error).name === 'AbortError') {
        throw new StakeApiError('Request timeout', 408);
      }

      throw error;
    }
  }

  /**
   * Handle and normalize errors
   * 
   * Ensures all errors are wrapped in StakeApiError for consistent error handling
   * 
   * @private
   */
  private handleError(error: unknown): StakeApiError {
    // Already a StakeApiError, return as-is
    if (error instanceof StakeApiError) {
      return error;
    }

    // Standard Error, wrap in StakeApiError
    if (error instanceof Error) {
      return new StakeApiError(error.message);
    }

    // Unknown error type, wrap with generic message
    return new StakeApiError('Unknown error occurred');
  }

  /**
   * Mock eligibility check for development
   * 
   * @private
   */
  private mockEligibilityCheck(code: string): EligibilityResult {
    // Simulate various eligibility scenarios
    if (code.includes('INVALID')) {
      return {
        eligible: false,
        reason: 'Invalid code',
      };
    }

    if (code.includes('EXPIRED')) {
      return {
        eligible: false,
        reason: 'Code expired',
      };
    }

    if (code.includes('WAGER')) {
      return {
        eligible: false,
        reason: 'Wager requirement not met',
        wagersRequired: 100,
      };
    }

    return {
      eligible: true,
      wagersRequired: 50,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
  }

  /**
   * Mock code claim for development
   * 
   * @private
   */
  private mockClaimCode(code: string): ClaimResult {
    if (code.includes('INVALID')) {
      return {
        success: false,
        error: 'Invalid code',
      };
    }

    if (code.includes('EXPIRED')) {
      return {
        success: false,
        error: 'Code expired',
      };
    }

    return {
      success: true,
      reward: {
        type: 'bonus',
        amount: 10,
        currency: 'USD',
      },
    };
  }
}
