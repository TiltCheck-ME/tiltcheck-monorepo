/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */
/**
 * Casino License Verification
 * 
 * Verifies if a casino has proper licensing before analyzing fairness.
 * Unlicensed casinos get a warning instead of analysis.
 */

export interface LicenseInfo {
  found: boolean;
  licenseNumber?: string;
  issuingAuthority?: string;
  jurisdiction?: string;
  location?: 'footer' | 'about' | 'terms' | 'license-page';
  verified: boolean;
  source: string;
  lastVerifiedAt: string;
  warnings: string[];
}

export interface CasinoVerification {
  isLegitimate: boolean;
  licenseInfo: LicenseInfo;
  verdict: 'legitimate' | 'unlicensed' | 'suspicious' | 'unknown';
  shouldAnalyze: boolean;
  warningMessage?: string;
}

export interface LicensePresentation {
  tone: 'verified' | 'warning' | 'risk' | 'pending';
  summary: string;
  details: string[];
}

const EXTENSION_LICENSE_SOURCE = 'Current page DOM scan';
const LICENSE_STALE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Known legitimate gambling authorities
 */
const LEGITIMATE_AUTHORITIES = [
  // Tier 1 (Strictest)
  { name: 'UK Gambling Commission', pattern: /UKGC|UK\s*Gambling|39\d{3}/i, jurisdiction: 'United Kingdom' },
  { name: 'Malta Gaming Authority', pattern: /MGA|Malta\s*Gaming|MGA\/\w+\/\d+/i, jurisdiction: 'Malta' },
  { name: 'Gibraltar Gambling Commission', pattern: /Gibraltar|RGL/i, jurisdiction: 'Gibraltar' },
  
  // Tier 2 (Reputable)
  { name: 'Curacao eGaming', pattern: /Cura[cç]ao|8048\/JAZ|1668\/JAZ/i, jurisdiction: 'Curacao' },
  { name: 'Kahnawake Gaming Commission', pattern: /Kahnawake/i, jurisdiction: 'Canada' },
  { name: 'Alderney Gambling Control', pattern: /Alderney/i, jurisdiction: 'Alderney' },
  { name: 'Isle of Man Gambling', pattern: /Isle\s*of\s*Man/i, jurisdiction: 'Isle of Man' },
  
  // Tier 3 (Emerging)
  { name: 'Anjouan Gaming', pattern: /Anjouan/i, jurisdiction: 'Comoros' },
  { name: 'Costa Rica Gaming', pattern: /Costa\s*Rica/i, jurisdiction: 'Costa Rica' },
  
  // US State licenses
  { name: 'Nevada Gaming Control', pattern: /Nevada\s*Gaming/i, jurisdiction: 'Nevada, USA' },
  { name: 'New Jersey DGE', pattern: /New\s*Jersey|DGE|Division\s*of\s*Gaming/i, jurisdiction: 'New Jersey, USA' },
  { name: 'Pennsylvania Gaming', pattern: /Pennsylvania\s*Gaming|PGCB/i, jurisdiction: 'Pennsylvania, USA' },
];

/**
 * Red flag patterns (unlicensed/scam indicators)
 */
const RED_FLAGS = [
  { pattern: /no\s*license/i, label: 'site claims no license' },
  { pattern: /unlicensed/i, label: 'site describes itself as unlicensed' },
  { pattern: /offshore\s+(unlicensed|unregulated)/i, label: 'offshore unlicensed/unregulated language detected' },
  { pattern: /unregulated/i, label: 'site describes itself as unregulated' },
  { pattern: /bitcoin\s*only/i, label: 'bitcoin-only language detected' },
];

export class CasinoLicenseVerifier {
  /**
   * Scan document for license information
   */
  findLicenseInfo(doc: Document = document): LicenseInfo {
    const warnings: string[] = [];
    let found = false;
    let licenseNumber: string | undefined;
    let issuingAuthority: string | undefined;
    let jurisdiction: string | undefined;
    let location: 'footer' | 'about' | 'terms' | 'license-page' | undefined;
    let source = EXTENSION_LICENSE_SOURCE;
    const lastVerifiedAt = new Date().toISOString();
    
    // 1. Check footer (most common location)
    const footer = doc.querySelector('footer') || 
                   doc.querySelector('[class*="footer"]') ||
                   doc.querySelector('[id*="footer"]');
    
    if (footer) {
      const footerText = footer.textContent || '';
      const licenseMatch = this.extractLicense(footerText);
      
      if (licenseMatch.found) {
        found = true;
        licenseNumber = licenseMatch.licenseNumber;
        issuingAuthority = licenseMatch.authority;
        jurisdiction = licenseMatch.jurisdiction;
        location = 'footer';
        source = 'Current page footer scan';
      }
    }
    
    // 2. Check common license page links
    if (!found) {
      const licenseLinks = Array.from(doc.querySelectorAll('a')).filter(a => 
        /license|regulation|authority|gaming\s*commission/i.test(a.textContent || '')
      );
      
      if (licenseLinks.length > 0) {
        for (const link of licenseLinks) {
          const linkText = link.textContent || '';
          const licenseMatch = this.extractLicense(linkText);
          
          if (licenseMatch.found) {
            found = true;
            licenseNumber = licenseMatch.licenseNumber;
            issuingAuthority = licenseMatch.authority;
            jurisdiction = licenseMatch.jurisdiction;
            location = 'license-page';
            source = 'Current page license-link scan';
            break;
          }
        }
      }
    }
    
    // 3. Check "About" or "Terms" pages
    if (!found) {
      const aboutLinks = Array.from(doc.querySelectorAll('a')).filter(a =>
        /about|terms|legal|responsible/i.test(a.textContent || '')
      );
      
      if (aboutLinks.length > 0) {
        warnings.push('License info may be on About/Terms page - not verified automatically');
        source = 'Current page legal-link scan';
      }
    }
    
    // 4. Check for red flags
    const bodyText = doc.body.textContent || '';
    for (const redFlag of RED_FLAGS) {
      if (redFlag.pattern.test(bodyText)) {
        warnings.push(redFlag.label);
      }
    }
    
    return {
      found,
      licenseNumber,
      issuingAuthority,
      jurisdiction,
      location,
      verified: found && issuingAuthority !== undefined,
      source,
      lastVerifiedAt,
      warnings
    };
  }
  
  /**
   * Extract license from text
   */
  private extractLicense(text: string): {
    found: boolean;
    licenseNumber?: string;
    authority?: string;
    jurisdiction?: string;
  } {
    for (const auth of LEGITIMATE_AUTHORITIES) {
      if (auth.pattern.test(text)) {
        // Try to extract license number
        const licenseMatch = text.match(/\b([A-Z0-9]{4,}\/[A-Z0-9]+\/\d{4,}|\d{4,})\b/);
        
        return {
          found: true,
          licenseNumber: licenseMatch?.[1],
          authority: auth.name,
          jurisdiction: auth.jurisdiction
        };
      }
    }
    
    return { found: false };
  }
  
  /**
   * Verify casino legitimacy
   */
  verifyCasino(doc: Document = document): CasinoVerification {
    const licenseInfo = this.findLicenseInfo(doc);
    
    // Determine verdict
    let verdict: 'legitimate' | 'unlicensed' | 'suspicious' | 'unknown';
    let shouldAnalyze: boolean;
    let warningMessage: string | undefined;
    
    if (licenseInfo.verified) {
      verdict = 'legitimate';
      shouldAnalyze = true;
    } else if (licenseInfo.found && licenseInfo.warnings.length === 0) {
      verdict = 'unknown';
      shouldAnalyze = true;
      warningMessage = 'License found but could not be verified automatically. Proceeding with caution.';
    } else if (licenseInfo.warnings.length > 0) {
      verdict = 'suspicious';
      // Suspicious casinos still get analyzed - degens need tilt data most at sketchy sites.
      // Only fully unlicensed casinos block analysis.
      shouldAnalyze = true;
      warningMessage = `Suspicious licensing signals detected: ${licenseInfo.warnings.join(', ')}. Analysis is active with elevated risk indicators.`;
    } else {
      verdict = 'unlicensed';
      shouldAnalyze = false;
      warningMessage = 'No valid gambling license found yet. Normal TiltCheck analysis is disabled on this site.';
    }
    
    return {
      isLegitimate: verdict === 'legitimate',
      licenseInfo,
      verdict,
      shouldAnalyze,
      warningMessage
    };
  }
  
  /**
   * Get user-friendly message about casino legitimacy
   */
  getVerificationMessage(verification: CasinoVerification): string {
    if (verification.verdict === 'legitimate') {
      return `Licensed by ${verification.licenseInfo.issuingAuthority} (${verification.licenseInfo.jurisdiction})${
        verification.licenseInfo.licenseNumber ? ` - License #${verification.licenseInfo.licenseNumber}` : ''
      }`;
    } else if (verification.verdict === 'unknown') {
      return verification.warningMessage || 'License status unknown';
    } else if (verification.verdict === 'suspicious') {
      return verification.warningMessage || 'Suspicious licensing';
    } else {
      return verification.warningMessage || 'No license found';
    }
  }
}

function formatLicenseAuthority(licenseInfo: LicenseInfo): string {
  return licenseInfo.issuingAuthority || 'Unknown authority';
}

function formatLicenseDetails(licenseInfo: LicenseInfo): string {
  const authority = formatLicenseAuthority(licenseInfo);
  const jurisdiction = licenseInfo.jurisdiction ? ` (${licenseInfo.jurisdiction})` : '';
  const licenseNumber = licenseInfo.licenseNumber ? ` #${licenseInfo.licenseNumber}` : '';
  const location = licenseInfo.location ? ` via ${licenseInfo.location}` : '';
  return `${authority}${jurisdiction}${licenseNumber}${location}`;
}

function formatVerificationDate(value?: string): string {
  if (!value) {
    return 'pending';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return 'unknown';
  }

  return new Date(parsed).toLocaleDateString();
}

function isStaleVerification(value?: string): boolean {
  if (!value) {
    return false;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return false;
  }

  return Date.now() - parsed > LICENSE_STALE_WINDOW_MS;
}

function buildLicenseDetails(licenseInfo: LicenseInfo): string[] {
  const details = [
    `Source: ${licenseInfo.source || EXTENSION_LICENSE_SOURCE}`,
    `Last verified: ${formatVerificationDate(licenseInfo.lastVerifiedAt)}`,
    'Not legal advice. No regulator endorsement implied.',
  ];

  if (isStaleVerification(licenseInfo.lastVerifiedAt)) {
    details.splice(2, 0, 'Stale warning: license scan is older than 7 days.');
  }

  if (licenseInfo.warnings.length > 0) {
    details.push(`Warnings: ${licenseInfo.warnings.join(', ')}`);
  }

  return details;
}

export function buildLicensePresentation(verification: CasinoVerification | null | undefined): LicensePresentation {
  if (!verification) {
    return {
      tone: 'pending',
      summary: 'License: scanning current site...',
      details: [
        `Source: ${EXTENSION_LICENSE_SOURCE}`,
        'Last verified: pending',
        'Not legal advice. No regulator endorsement implied.',
      ],
    };
  }

  const details = buildLicenseDetails(verification.licenseInfo);

  if (verification.verdict === 'legitimate') {
    return {
      tone: 'verified',
      summary: `License verified: ${formatLicenseDetails(verification.licenseInfo)}`,
      details,
    };
  }

  if (verification.verdict === 'unknown') {
    return {
      tone: 'warning',
      summary: verification.warningMessage || `License found but not fully verified: ${formatLicenseDetails(verification.licenseInfo)}`,
      details,
    };
  }

  return {
    tone: 'risk',
    summary: verification.warningMessage || 'License verification failed. Normal TiltCheck analysis is disabled on this site.',
    details,
  };
}

export function getAnalysisBlockMessage(verification: CasinoVerification | null | undefined): string | null {
  if (!verification || verification.shouldAnalyze) {
    return null;
  }

  return verification.warningMessage || 'Normal TiltCheck analysis is disabled on this site until a valid license is verified.';
}
