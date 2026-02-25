// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * SusLink Module
 * 
 * Integrates link scanning with the TiltCheck Event Router.
 * 
 * Subscribes to:
 * - promo.submitted → scans submitted links
 * - link.feedback → processes user feedback for AI self-training
 * 
 * Publishes:
 * - link.scanned → scan results
 * - link.flagged → high-risk links
 */

import { eventRouter } from '@tiltcheck/event-router';
import type { TiltCheckEvent, LinkScanResult } from '@tiltcheck/types';
import { LinkScanner } from './scanner.js';
import { emitDomainTrustFromScan } from './trust-domain.js';

export class SusLinkModule {
  private scanner: LinkScanner;

  constructor() {
    this.scanner = new LinkScanner();
    this.setupEventHandlers();
    console.log('[SusLink] Module initialized ✅');
  }

  private setupEventHandlers(): void {
    // Subscribe to promo submissions
    eventRouter.subscribe(
      'promo.submitted',
      this.handlePromoSubmission.bind(this),
      'suslink'
    );

    // Subscribe to user feedback for AI self-training
    eventRouter.subscribe(
      'link.feedback',
      this.handleLinkFeedback.bind(this),
      'suslink'
    );

    console.log('[SusLink] Subscribed to events');
  }

  /**
   * Handle user feedback for link scans
   * Useful for AI self-training and improving accuracy
   */
  private async handleLinkFeedback(event: TiltCheckEvent): Promise<void> {
    const { url, userReportedRisk, actualStatus, comments } = event.data;

    if (!url || !actualStatus) {
      console.warn('[SusLink] Feedback event missing required data');
      return;
    }

    console.log(`[SusLink] Processing feedback for ${url} (Actual: ${actualStatus})`);

    const success = await this.scanner.submitFeedback({
      url,
      userReportedRisk,
      actualStatus,
      comments
    });

    if (success) {
      console.log(`[SusLink] Feedback relayed to AI Gateway for training ✅`);
    }
  }

  /**
   * Handle promo submission events
   */
  private async handlePromoSubmission(event: TiltCheckEvent): Promise<void> {
    const { url } = event.data;

    if (!url) {
      console.warn('[SusLink] Promo submission missing URL');
      return;
    }

    console.log(`[SusLink] Scanning promo URL: ${url}`);

    // Perform AI-enhanced scan
    const result = await this.scanner.scanWithAI(url);

    await this.publishScanResult(result, event.userId);
  }

  /**
   * Manual scan API (can be called directly for testing)
   */
  async scanUrl(url: string, userId?: string) {
    const result = await this.scanner.scanWithAI(url);
    await this.publishScanResult(result, userId);
    return result;
  }

  /**
   * Quick check without publishing events
   */
  quickCheck(url: string) {
    return this.scanner.quickCheck(url);
  }

  /**
   * Shared logic for publishing scan + trust events
   */
  private async publishScanResult(result: LinkScanResult, userId?: string) {
    // Always publish raw scan result
    await eventRouter.publish('link.scanned', 'suslink', result, userId);

    // Flag high-risk links separately
    if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
      console.log(`[SusLink] ⚠️  Flagging risky link: ${result.url} (${result.riskLevel})`);
      await eventRouter.publish(
        'link.flagged',
        'suslink',
        { url: result.url, riskLevel: result.riskLevel, reason: result.reason },
        userId
      );
    }

    // Emit unified trust domain update event based on scan
    await emitDomainTrustFromScan(result, userId);
  }
}

// Export singleton instance
export const suslink = new SusLinkModule();
