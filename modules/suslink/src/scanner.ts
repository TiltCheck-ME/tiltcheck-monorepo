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
 * Philosophy: Inform, don't block. Give users the info to make smart decisions.
 */

import type { RiskLevel, LinkScanResult } from '@tiltcheck/types';

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
    } catch (error) {
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
   * Follow redirect chain (simplified - would use fetch in real implementation)
   */
  async followRedirects(url: string): Promise<string[]> {
    // In real implementation, would use fetch with redirect: 'manual'
    // For now, just return the original URL
    return [url];
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
}
