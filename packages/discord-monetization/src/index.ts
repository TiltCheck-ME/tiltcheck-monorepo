/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import axios from 'axios';
import { DISCORD_API_BASE, type DiscordEntitlement, type ShopConfig } from './types.js';

/**
 * Discord Monetization Manager
 * Handles SKU validation, entitlement checks, and consumption of consumables.
 */
export class DiscordShopManager {
  private config: ShopConfig;

  constructor(config: ShopConfig) {
    this.config = config;
  }

  /**
   * Get all entitlements for a user, optionally filtered by SKU IDs
   */
  async getEntitlements(userId: string, skuIds: string[] = []): Promise<DiscordEntitlement[]> {
    try {
      let url = `${DISCORD_API_BASE}/applications/${this.config.applicationId}/entitlements?user_id=${userId}`;
      if (skuIds.length > 0) {
        url += `&sku_ids=${skuIds.join(',')}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bot ${this.config.botToken}`,
        },
      });

      return response.data as DiscordEntitlement[];
    } catch (error: any) {
      console.error('[DiscordMonetization] Failed to fetch entitlements:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Check if a user has an active (unconsumed/not-deleted) purchase for a specific SKU.
   * Returns the first valid entitlement found or null.
   */
  async verifyAndGetEntitlement(userId: string, skuId: string): Promise<DiscordEntitlement | null> {
    const entitlements = await this.getEntitlements(userId, [skuId]);
    // Filter for unconsumed and non-deleted entitlements
    return entitlements.find(e => !e.consumed && !e.deleted) || null;
  }

  /**
   * Mark a consumable entitlement as consumed.
   * This is required by Discord to allow the user to purchase the item again.
   */
  async consumeEntitlement(userId: string, entitlementId: string): Promise<boolean> {
    try {
      const url = `${DISCORD_API_BASE}/applications/${this.config.applicationId}/entitlements/${entitlementId}/consume`;
      
      await axios.post(url, {}, {
        headers: {
          Authorization: `Bot ${this.config.botToken}`,
        },
      });

      console.log(`[DiscordMonetization] ✅ SKU CONSUMED: ${entitlementId} for User: ${userId}`);
      return true;
    } catch (error: any) {
      console.error('[DiscordMonetization] ❌ CONSUMPTION FAILED:', error.response?.data || error.message);
      return false;
    }
  }
}
