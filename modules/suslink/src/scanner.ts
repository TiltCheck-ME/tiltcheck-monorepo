// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * SusLink - Link Scanner & Risk Detector
 * 
 * Scans URLs for:
 * - Scam patterns
 * - Redirect chains
 * - Domain reputation
 * - Casino impersonation
 * - Phishing attempts
 * 
 * Enhanced with AI Gateway for intelligent content moderation.
 * Philosophy: Inform, don't block. Give users the info to make smart decisions.
 */

import type { RiskLevel, LinkScanResult } from '@tiltcheck/types';
import { isCasinoURL } from '@tiltcheck/validator';

// AI Gateway client for enhanced moderation
let aiClient: any = null;

// Initialize AI client dynamically
async function getAIClient() {
  if (!aiClient) {
    try {
      const module = await import('@tiltcheck/ai-client');
      aiClient = module.aiClient;
    } catch (error) {
      console.log('[SusLink] AI client not available, using heuristic only:', error);
    }
  }
  return aiClient;
}

// High-risk TLDs commonly used in scams
const RISKY_TLDS = [
  '.tk', '.ml', '.ga', '.cf', '.gq', // Free domains
  '.xyz', '.top', '.win', '.bid',
  '.download', '.review', '.science',
];

// Known casino domains for impersonation detection
const KNOWN_CASINOS = [
  'stake.com',
  'rollbit.com',
  'duelbits.com',
  'bc.game',
  'roobet.com',
  'shuffle.com',
];

// Scam keywords
const SCAM_KEYWORDS = [
  'free-money',
  'guaranteed-win',
  'hack',
  'generator',
  'unlimited',
  'claim-now',
  'verify-account',
  'update-payment',
  'suspended',
  'action-required',
];

export class LinkScanner {
  /**
   * Main scan function
   */
  async scan(url: string): Promise<LinkScanResult> {
    const startTime = Date.now();

    try {
      // Parse URL
      const parsedUrl = new URL(url);

      // Run all checks
      const checks = {
        tld: this.checkTLD(parsedUrl),
        keywords: this.checkKeywords(parsedUrl),
        impersonation: this.checkImpersonation(parsedUrl),
        length: this.checkLength(parsedUrl),
        subdomain: this.checkSubdomain(parsedUrl),
      };

      // Calculate risk level
      const riskLevel = this.calculateRisk(checks);
      const reason = this.buildReason(checks);

      const result: LinkScanResult = {
        url,
        riskLevel,
        reason,
        scannedAt: new Date(),
      };

      console.log(`[SusLink] Scanned ${url} in ${Date.now() - startTime}ms → ${riskLevel}`);

      return result;
    } catch (_error) {
      // Invalid URL
      return {
        url,
        riskLevel: 'critical',
        reason: 'Invalid or malformed URL',
        scannedAt: new Date(),
      };
    }
  }

  /**
   * Check if TLD is high-risk
   */
  private checkTLD(url: URL): { risky: boolean; reason?: string } {
    const hostname = url.hostname.toLowerCase();

    for (const tld of RISKY_TLDS) {
      if (hostname.endsWith(tld)) {
        return { risky: true, reason: `High-risk TLD: ${tld}` };
      }
    }

    return { risky: false };
  }

  /**
   * Check for scam keywords
   */
  private checkKeywords(url: URL): { risky: boolean; reason?: string } {
    const fullUrl = url.href.toLowerCase();

    for (const keyword of SCAM_KEYWORDS) {
      if (fullUrl.includes(keyword)) {
        return { risky: true, reason: `Suspicious keyword: "${keyword}"` };
      }
    }

    return { risky: false };
  }

  /**
   * Check for casino impersonation
   */
  private checkImpersonation(url: URL): { risky: boolean; reason?: string } {
    const hostname = url.hostname.toLowerCase();

    // Check for typosquatting or impersonation
    for (const casino of KNOWN_CASINOS) {
      const casinoBase = casino.replace('.com', '').replace('.game', '');

      // If hostname contains casino name but isn't exact match
      if (hostname.includes(casinoBase) && hostname !== casino) {
        // Examples: stakee.com, stake-free.com, stake.xyz
        return {
          risky: true,
          reason: `Possible impersonation of ${casino}`
        };
      }
    }

    return { risky: false };
  }

  /**
   * Check URL length (extremely long URLs are suspicious)
   */
  private checkLength(url: URL): { risky: boolean; reason?: string } {
    if (url.href.length > 200) {
      return { risky: true, reason: 'Unusually long URL' };
    }

    return { risky: false };
  }

  /**
   * Check for suspicious subdomains
   */
  private checkSubdomain(url: URL): { risky: boolean; reason?: string } {
    const hostname = url.hostname.toLowerCase();
    const parts = hostname.split('.');

    // Multiple subdomains can be suspicious
    if (parts.length > 3) {
      return { risky: true, reason: 'Multiple subdomains detected' };
    }

    // Suspicious subdomain patterns
    const suspiciousPatterns = ['login', 'verify', 'secure', 'account', 'update'];
    for (const pattern of suspiciousPatterns) {
      if (parts[0] === pattern) {
        return { risky: true, reason: `Suspicious subdomain: ${pattern}` };
      }
    }

    return { risky: false };
  }

  /**
   * Calculate overall risk level from checks
   */
  private calculateRisk(checks: Record<string, { risky: boolean; reason?: string }>): RiskLevel {
    const riskyChecks = Object.values(checks).filter(c => c.risky).length;

    if (riskyChecks === 0) return 'safe';
    if (riskyChecks === 1) return 'suspicious';
    if (riskyChecks === 2) return 'high';
    return 'critical';
  }

  /**
   * Build human-readable reason from checks
   */
  private buildReason(checks: Record<string, { risky: boolean; reason?: string }>): string {
    const reasons = Object.values(checks)
      .filter(c => c.risky && c.reason)
      .map(c => c.reason);

    if (reasons.length === 0) {
      return 'No suspicious patterns detected';
    }

    return reasons.join('; ');
  }

  /**
   * Follow redirect chain up to 10 hops to detect redirect-based attacks
   * Returns the chain of URLs encountered
   */
  async followRedirects(url: string, maxHops = 10): Promise<string[]> {
    const chain: string[] = [url];
    let currentUrl = url;
    let hops = 0;

    while (hops < maxHops) {
      try {
        const response = await fetch(currentUrl, {
          redirect: 'manual',
          method: 'HEAD',
          timeout: 5000,
          headers: {
            'User-Agent': 'TiltCheck-SusLink/1.0 (+https://tiltcheck.io)',
          },
        } as any);

        // Check for redirect status codes (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          if (!location) break; // No Location header, stop

          try {
            // Validate the redirect URL
            new URL(location);
            currentUrl = location;
            chain.push(currentUrl);
            hops++;
          } catch {
            // Invalid redirect URL, stop chain
            break;
          }
        } else {
          // No redirect, chain complete
          break;
        }
      } catch (error) {
        // Network error or timeout, return what we have
        console.debug('[SusLink] Redirect follow stopped:', error);
        break;
      }
    }

    return chain;
  }

  /**
   * Quick risk check without full scan (faster)
   */
  quickCheck(url: string): RiskLevel {
    try {
      const parsedUrl = new URL(url);

      // Quick TLD check
      if (this.checkTLD(parsedUrl).risky) return 'high';

      // Quick keyword check
      if (this.checkKeywords(parsedUrl).risky) return 'suspicious';

      return 'safe';
    } catch {
      return 'critical';
    }
  }

  /**
   * AI-enhanced scan using AI Gateway for content moderation
   * Provides more accurate scam detection and reasoning
   */
  async scanWithAI(url: string): Promise<LinkScanResult & {
    aiEnhanced?: boolean;
    aiConfidence?: number;
    suggestedAction?: string;
    safeMode?: boolean;
  }> {
    // First, run heuristic scan
    const heuristicResult = await this.scan(url);

    // Safe Mode fallback: Use isCasinoURL validator to refine heuristic if AI is down
    const safeModeHeuristic = () => {
      const isCasino = isCasinoURL(url);
      if (isCasino && heuristicResult.riskLevel === 'safe') {
        return {
          ...heuristicResult,
          riskLevel: 'suspicious' as RiskLevel,
          reason: 'Known casino domain detected via validator',
          safeMode: true
        };
      }
      return { ...heuristicResult, safeMode: true };
    };

    const client = await getAIClient();

    if (client) {
      try {
        // Set a timeout for the AI request to trigger safe mode
        const aiPromise = client.moderate(url, {
          url,
          contentType: 'url',
        });

        // Simple 5s timeout racing with the AI call
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI Request Timeout')), 5000)
        );

        const aiResult = await Promise.race([aiPromise, timeoutPromise]) as any;

        if (aiResult.success && aiResult.data) {
          const aiData = aiResult.data;

          // Merge AI insights with heuristic results
          let finalRiskLevel: RiskLevel = heuristicResult.riskLevel;

          // AI can upgrade risk level if it detects something heuristics missed
          if (aiData.isScam && finalRiskLevel === 'safe') {
            finalRiskLevel = 'suspicious';
          }
          if (aiData.categories?.scam > 0.7 || aiData.categories?.malicious > 0.5) {
            finalRiskLevel = 'high';
          }
          if (aiData.categories?.scam > 0.9) {
            finalRiskLevel = 'critical';
          }

          const aiReason = aiData.reasoning || '';
          const combinedReason = aiReason
            ? `${heuristicResult.reason}. AI: ${aiReason}`
            : heuristicResult.reason;

          return {
            url,
            riskLevel: finalRiskLevel,
            reason: combinedReason,
            scannedAt: new Date(),
            aiEnhanced: true,
            aiConfidence: aiData.confidence || 0,
            suggestedAction: aiData.suggestedAction,
          };
        }
      } catch (error) {
        console.warn('[SusLink] Safe Mode triggered: AI scan failed or timed out. Using heuristic fallback.', error);
        return safeModeHeuristic();
      }
    }

    // Return heuristic-only result (Safe Mode)
    return safeModeHeuristic();
  }

  /**
   * Submit feedback to the AI to improve scanning accuracy
   */
  async submitFeedback(data: {
    url: string;
    userReportedRisk: RiskLevel;
    actualStatus: 'malicious' | 'safe';
    comments?: string;
  }): Promise<boolean> {
    const client = await getAIClient();
    if (!client) return false;

    try {
      const response = await client.submitFeedback({
        application: 'moderation',
        originalRequest: {
          application: 'moderation',
          prompt: data.url,
          context: { url: data.url },
        },
        actualOutcome: data.actualStatus,
        userCorrected: true,
        comments: `User reported as ${data.userReportedRisk}. ${data.comments || ''}`,
      });

      return response.success;
    } catch (error) {
      console.error('[SusLink] Failed to submit AI feedback:', error);
      return false;
    }
  }
}
