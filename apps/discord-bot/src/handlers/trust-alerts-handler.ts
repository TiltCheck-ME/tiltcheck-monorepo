/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Trust Alerts Handler
 * 
 * Subscribes to trust events from the EventRouter and posts alerts to Discord channels.
 * Handles:
 * - trust.domain.updated (domain trust changes)
 * - trust.casino.updated (casino trust changes)
 * - trust.degen.updated (degen/generosity trust changes)
 * - link.flagged (high-risk links detected)
 * - bonus.nerf.detected (casino bonus nerfs detected)
 */

import { eventRouter } from '@tiltcheck/event-router';
import { getAlertService } from '../services/alert-service.js';
import type { TiltCheckEvent, TrustCasinoUpdateEvent, TrustDomainUpdateEvent, TrustDegenUpdateEvent } from '@tiltcheck/types';

export class TrustAlertsHandler {
  /**
   * Initialize trust event subscriptions
   */
  static initialize(): void {
    console.log('[TrustAlertsHandler] Initializing trust alert subscriptions...');

    // Subscribe to casino trust updates
    eventRouter.subscribe(
      'trust.casino.updated',
      this.onCasinoTrustUpdated.bind(this),
      'discord-bot'
    );

    // Subscribe to domain trust updates
    eventRouter.subscribe(
      'trust.domain.updated',
      this.onDomainTrustUpdated.bind(this),
      'discord-bot'
    );

    // Subscribe to degen trust updates
    eventRouter.subscribe(
      'trust.degen.updated',
      this.onDegenTrustUpdated.bind(this),
      'discord-bot'
    );

    // Subscribe to flagged links (high-risk)
    eventRouter.subscribe(
      'link.flagged',
      this.onLinkFlagged.bind(this),
      'discord-bot'
    );

    // Subscribe to bonus nerfs
    eventRouter.subscribe(
      'bonus.nerf.detected',
      this.onBonusNerfDetected.bind(this),
      'discord-bot'
    );

    console.log('[TrustAlertsHandler] Trust alert subscriptions initialized');
  }

  /**
   * Handle casino trust updates
   */
  private static async onCasinoTrustUpdated(evt: TiltCheckEvent<TrustCasinoUpdateEvent>): Promise<void> {
    try {
      const { casinoName, previousScore, newScore, delta, severity, reason, source } = evt.data;

      // Determine severity level for alert
      const alertSeverity = severity ? (severity >= 3 ? 'critical' : severity >= 2 ? 'warning' : 'info') : 'info';

      const alertService = getAlertService();
      if (!alertService) {
        console.warn('[TrustAlertsHandler] AlertService not initialized');
        return;
      }

      await alertService.postTrustAlert({
        title: `🎰 Casino Trust: ${casinoName}`,
        description: reason || `Trust score changed by ${delta || 0}`,
        severity: alertSeverity,
        data: {
          casinoName,
          previousScore,
          newScore,
          delta,
          source,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[TrustAlertsHandler] Error posting casino trust alert:', error);
    }
  }

  /**
   * Handle domain trust updates
   */
  private static async onDomainTrustUpdated(evt: TiltCheckEvent<TrustDomainUpdateEvent>): Promise<void> {
    try {
      const { domain, newScore, delta, severity, reason, source } = evt.data;

      // Determine severity level for alert
      const alertSeverity = severity ? (severity >= 3 ? 'critical' : severity >= 2 ? 'warning' : 'info') : 'info';

      const alertService = getAlertService();
      if (!alertService) {
        console.warn('[TrustAlertsHandler] AlertService not initialized');
        return;
      }

      await alertService.postTrustAlert({
        title: `🔗 Domain Trust: ${domain}`,
        description: reason || `Trust score changed by ${delta || 0}`,
        severity: alertSeverity,
        data: {
          domain,
          newScore,
          delta,
          source,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[TrustAlertsHandler] Error posting domain trust alert:', error);
    }
  }

  /**
   * Handle degen trust updates
   */
  private static async onDegenTrustUpdated(evt: TiltCheckEvent<TrustDegenUpdateEvent>): Promise<void> {
    try {
      const { userId, previousScore, newScore, delta, reason, source } = evt.data;

      const alertService = getAlertService();
      if (!alertService) {
        console.warn('[TrustAlertsHandler] AlertService not initialized');
        return;
      }

      await alertService.postTrustAlert({
        title: `👤 Degen Trust Updated`,
        description: reason || `Trust score changed by ${delta || 0}`,
        severity: 'info',
        userId,
        data: {
          userId,
          previousScore,
          newScore,
          delta,
          source,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[TrustAlertsHandler] Error posting degen trust alert:', error);
    }
  }

  /**
   * Handle flagged links (high-risk)
   */
  private static async onLinkFlagged(evt: TiltCheckEvent<any>): Promise<void> {
    try {
      const { url, riskLevel, reason } = evt.data;

      const alertService = getAlertService();
      if (!alertService) {
        console.warn('[TrustAlertsHandler] AlertService not initialized');
        return;
      }

      // Map risk level to alert severity
      const severity = riskLevel === 'critical' ? 'critical' : riskLevel === 'high' ? 'warning' : 'info';

      await alertService.postTrustAlert({
        title: `⚠️ High-Risk Link Flagged`,
        description: `Risk Level: ${riskLevel}\n${reason || 'Suspicious link detected'}`,
        severity,
        data: {
          url,
          riskLevel,
          reason,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[TrustAlertsHandler] Error posting link flagged alert:', error);
    }
  }

  /**
   * Handle bonus nerfs
   */
  private static async onBonusNerfDetected(evt: TiltCheckEvent<any>): Promise<void> {
    try {
      const { casinoName, percentDrop, reason } = evt.data;

      const alertService = getAlertService();
      if (!alertService) {
        console.warn('[TrustAlertsHandler] AlertService not initialized');
        return;
      }

      await alertService.postTrustAlert({
        title: `📉 Bonus Nerf Detected`,
        description: `Casino: ${casinoName}\nDrop: ${(percentDrop * 100).toFixed(1)}%`,
        severity: percentDrop > 0.2 ? 'critical' : 'warning',
        data: {
          casinoName,
          percentDrop,
          reason,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[TrustAlertsHandler] Error posting bonus nerf alert:', error);
    }
  }
}
