/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { eventRouter } from '@tiltcheck/event-router';
import type { TiltCheckEvent } from '@tiltcheck/types';

export class FreeSpinScanModule {
  private submissions: any[] = [];
  private blockedDomains: Set<string> = new Set();
  private blockedPatterns: Set<string> = new Set();

  // Admin methods to update blocklist
  blockDomain(domain: string) {
    this.blockedDomains.add(domain.toLowerCase());
  }
  unblockDomain(domain: string) {
    this.blockedDomains.delete(domain.toLowerCase());
  }
  blockPattern(pattern: string) {
    this.blockedPatterns.add(pattern);
  }
  unblockPattern(pattern: string) {
    this.blockedPatterns.delete(pattern);
  }

  // Get blocklists
  getBlockedDomains(): string[] {
    return Array.from(this.blockedDomains);
  }
  getBlockedPatterns(): string[] {
    return Array.from(this.blockedPatterns);
  }

  // Get submissions
  getSubmissions(status?: string): any[] {
    if (!status) return this.submissions;
    return this.submissions.filter(s => s.status === status);
  }

  // Mod approval/denial (aliased for API consistency)
  async approvePromo(submissionId: number, modId: string) {
    return this.approveSubmission(submissionId, modId);
  }

  async denyPromo(submissionId: number, modId: string, reason?: string) {
    return this.denySubmission(submissionId, modId, reason);
  }

  getPendingPromos(): any[] {
    return this.getSubmissions('pending');
  }

  async approveSubmission(submissionId: number, modId: string) {
    const submission = this.submissions.find(s => s.id === submissionId);
    if (!submission) throw new Error('Submission not found');
    submission.status = 'approved';
    submission.reviewedBy = modId;
    submission.reviewedAt = new Date().toISOString();
    await eventRouter.publish('promo.approved' as any, 'freespinscan', submission, submission.userId);
    return submission;
  }

  async denySubmission(submissionId: number, modId: string, reason?: string) {
    const submission = this.submissions.find(s => s.id === submissionId);
    if (!submission) throw new Error('Submission not found');
    submission.status = 'denied';
    submission.reviewedBy = modId;
    submission.reviewedAt = new Date().toISOString();
    submission.denyReason = reason;
    await eventRouter.publish('promo.denied' as any, 'freespinscan', submission, submission.userId);
    return submission;
  }

  // Check if URL is blocked
  isBlocked(url: string): string | null {
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (this.blockedDomains.has(domain)) {
        return `Domain blocked: ${domain}`;
      }
      for (const pattern of this.blockedPatterns) {
        if (url.includes(pattern)) {
          return `Pattern blocked: ${pattern}`;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  constructor() {
    eventRouter.subscribe('promo.submitted' as any, this.onPromoSubmitted.bind(this), 'freespinscan');
  }

  async submitPromo({ userId, url, bonusType, notes, casino }: {
    userId: string;
    url: string;
    bonusType: string;
    notes?: string;
    casino: string;
  }) {
    // Check blocklist first
    const blockReason = this.isBlocked(url);
    const submission = {
      id: this.submissions.length + 1,
      userId,
      url,
      bonusType,
      notes,
      casino,
      suslinkScore: null as any,
      status: blockReason ? 'blocked' : 'pending',
      blockReason,
      createdAt: new Date().toISOString(),
    };
    this.submissions.push(submission);

    if (blockReason) {
      // Auto-deny and notify
      await eventRouter.publish('promo.denied' as any, 'freespinscan', submission, userId);
      return submission;
    }

    // Scan URL via SusLink
    const scanResult = await import('@tiltcheck/suslink').then(m => m.suslink.scanUrl(url, userId));
    submission.suslinkScore = scanResult.riskLevel;

    // Publish promo.submitted event with scan result
    await eventRouter.publish('promo.submitted' as any, 'freespinscan', submission, userId);
    // Also publish link.scanned for Discord bot integration
    await eventRouter.publish('link.scanned' as any, 'freespinscan', scanResult, userId);
    return submission;
  }

  private async onPromoSubmitted(event: TiltCheckEvent) {
    const submission = event.data as any;
    console.log('[FreeSpinScan] promo.submitted', submission.url, submission.bonusType, submission.suslinkScore);
    // If risk is high/critical, flag for mod review
    if (submission.suslinkScore === 'high' || submission.suslinkScore === 'critical') {
      await eventRouter.publish('promo.flagged' as any, 'freespinscan', submission, submission.userId);
    }
    // Placeholder: auto-approve safe promos
    if (submission.suslinkScore === 'safe' || submission.suslinkScore === 'suspicious') {
      await eventRouter.publish('promo.approved' as any, 'freespinscan', submission, submission.userId);
    }
  }
}

export const freespinscan = new FreeSpinScanModule();
