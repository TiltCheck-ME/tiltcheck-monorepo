// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Bonus Feed Handler
 *
 * Subscribes to `bonus.discovered` events from the EventRouter and posts
 * them to a dedicated Discord channel.
 */

import { eventRouter } from '@tiltcheck/event-router';
import { getAlertService } from '../services/alert-service.js';
import type { BonusDiscoveredEventData, TiltCheckEvent } from '@tiltcheck/types';

export class BonusFeedHandler {
  /**
   * Initialize bonus feed event subscriptions.
   */
  static initialize(): void {
    console.log('[BonusFeedHandler] Initializing bonus feed subscription...');

    eventRouter.subscribe(
      'bonus.discovered',
      this.onBonusDiscovered.bind(this),
      'discord-bot'
    );

    console.log('[BonusFeedHandler] Bonus feed subscription initialized.');
  }

  /**
   * Handle a new bonus being discovered.
   */
  private static async onBonusDiscovered(evt: TiltCheckEvent<'bonus.discovered'>): Promise<void> {
    try {
      const { casino_name, value, bonus_type, expiry_message, is_expired, terms, bonus_url } = evt.data;

      // Don't post expired bonuses to the live feed.
      if (is_expired) return;

      const alertService = getAlertService();
      if (!alertService) {
        console.warn('[BonusFeedHandler] AlertService not initialized, cannot post bonus drop.');
        return;
      }

        await alertService.postBonusDrop({
          casinoName: casino_name,
          value,
          bonusType: bonus_type,
          expiryMessage: expiry_message,
          terms,
          bonusUrl: bonus_url,
        });
    } catch (error) {
      console.error('[BonusFeedHandler] Error posting bonus drop alert:', error);
    }
  }
}
