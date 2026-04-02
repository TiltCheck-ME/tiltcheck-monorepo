/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Bonus Feed Handler
 *
 * Subscribes to `bonus.discovered` events from the EventRouter and posts
 * them to a dedicated Discord channel.
 */

import { eventRouter } from '@tiltcheck/event-router';
import { getAlertService } from '../services/alert-service.js';
import type { TiltCheckEvent } from '@tiltcheck/types';
import { EmbedBuilder } from 'discord.js';

// This is the data we expect from the scraper worker's event
interface BonusDiscoveredEventData {
  casino_name: string;
  bonus_type: string;
  value: string;
  terms: string;
  expiry_message: string;
  is_expired: boolean;
}

export class BonusFeedHandler {
  /**
   * Initialize bonus feed event subscriptions.
   */
  static initialize(): void {
    console.log('[BonusFeedHandler] Initializing bonus feed subscription...');

    eventRouter.subscribe(
      'bonus.discovered',
      this.onBonusDiscovered.bind(this),
      'discord-bot-bonus-feed' // Unique consumer name
    );

    console.log('[BonusFeedHandler] Bonus feed subscription initialized.');
  }

  /**
   * Handle a new bonus being discovered.
   */
  private static async onBonusDiscovered(evt: TiltCheckEvent<'bonus.discovered', BonusDiscoveredEventData>): Promise<void> {
    try {
      const { casino_name, value, bonus_type, expiry_message, is_expired } = evt.data;

      // Don't post expired bonuses to the live feed.
      if (is_expired) return;

      const alertService = getAlertService();
      if (!alertService) {
        console.warn('[BonusFeedHandler] AlertService not initialized, cannot post bonus drop.');
        return;
      }

      const message = `**${value} ${bonus_type}** from **${casino_name}**.\n${expiry_message}`;

      await alertService.postBonusDrop(message);
    } catch (error) {
      console.error('[BonusFeedHandler] Error posting bonus drop alert:', error);
    }
  }
}